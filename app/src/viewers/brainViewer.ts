import * as _ from "lodash";

import {
    BufferGeometry,
    Color,
    Float32BufferAttribute,
    Line,
    Mesh,
    Object3D,
    PerspectiveCamera,
    Points,
    Scene,
    ShaderMaterial,
    Vector2,
    WebGLRenderer
} from "three";

import {
    apiEndpoint,
    ballTexture,
    colorMaps, compartmentFragmentShader, compartmentVertexShader,
    CoronalMax,
    defaultOpacity,
    defaultRadius, pointFragmentShader,
    pointVertexShader,
    SagittalMax, volumeCenterPoint
    // eslint-disable-next-line import/no-unresolved
} from "../constants";

// eslint-disable-next-line import/no-unresolved
import {AestheticMapping, ColorMapping} from "../models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {Epoch} from "../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {ColorLUT} from "../models/colorMap";
// eslint-disable-next-line import/no-unresolved
import {CompartmentNode} from "../models/compartmentTree";
// eslint-disable-next-line import/no-unresolved
import {SliceImageType, SliceType} from "../models/enums";
// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../models/penetration";
// eslint-disable-next-line import/no-unresolved
import {SlicingPlanes} from "../models/slicingPlanes";
// eslint-disable-next-line import/no-unresolved
import {TomographySlice} from "../models/tomographySlice";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const THREE = require("three");
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("three-obj-loader")(THREE);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const OrbitControls = require("ndb-three-orbit-controls")(THREE);

export class BrainViewer {
    public HEIGHT: number;
    public WIDTH: number;
    public container = "container";
    public flip = true; // flip y axis

    protected epochs: Epoch[];

    // animation
    protected animFrameHandle: number = null;
    protected timeMax = 0;
    protected timeMin = 0;
    protected _timeStep = 0.01;
    protected _timeVal = 0;

    protected backgroundColor = 0xffffff;
    protected cameraStartPosition: [number, number, number];
    protected fov = 45;

    protected renderer: WebGLRenderer = null;
    protected scene: Scene = null;
    protected camera: PerspectiveCamera = null;
    protected orbitControls: typeof OrbitControls = null;

    protected lastTimestamp: number = null;

    protected epochLabels: Object3D = null;
    protected epochSlider: Line = null;

    protected colorGradient: Object3D = null;

    protected loadedPenetrationsMap: Map<string, Penetration>;
    protected penetrationPointsMap: Map<string, Points<BufferGeometry>>;

    protected colorData: Map<string, number[]>;
    protected opacityData: Map<string, number[]>;
    protected radiusData: Map<string, number[]>;

    private tomographySlice: TomographySlice = null;
    private slicingPlanes: SlicingPlanes = null;

    private loadedCompartments: Set<string>;
    private visibleCompartments: Set<string>;

    constructor(epochs: Epoch[]) {
        this.epochs = epochs.sort((e1, e2) => e1.bounds[0] - e2.bounds[0]);
        this.cameraStartPosition = [0, 0, -20000];

        this.colorData = new Map<string, number[]>();
        this.opacityData = new Map<string, number[]>();
        this.radiusData = new Map<string, number[]>();

        this.loadedPenetrationsMap = new Map<string, Penetration>();
        this.penetrationPointsMap = new Map<string, Points<BufferGeometry>>();

        this.loadedCompartments = new Set<string>();
        this.visibleCompartments = new Set<string>();
    }

    protected initCamera(): void {
        const cameraPosition = this.cameraStartPosition[2];
        this.camera = new THREE.PerspectiveCamera(this.fov, this.WIDTH / this.HEIGHT, 1, cameraPosition * 5);
        this.scene.add(this.camera);
        this.camera.position.set(...this.cameraStartPosition);

        if (this.flip) {
            this.camera.up.setY(-1);
        }
    }

    protected initColorGradient(mapping: ColorMapping): void {
        const labelWidth = 40;
        const fontSize = 20;

        const root = new THREE.Object3D();
        const labelBaseScale = 0.01;

        const canvas = this.makeColorCanvas(500, labelWidth, fontSize, mapping);
        const texture = new THREE.CanvasTexture(canvas);

        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        const labelMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
        });
        const labels = new THREE.Sprite(labelMaterial);
        root.add(labels);

        labels.scale.x = canvas.width * labelBaseScale;
        labels.scale.y = canvas.height * labelBaseScale;

        this.camera.add(root);
        root.position.set(5.5, 0, -10);

        this.colorGradient = root;
    }

    protected initEpochLabels(): void {
        if (this.epochs.length === 0) {
            return null;
        }

        const labelWidth = 1000;
        const fontSize = 28;

        const epochs = this.epochs;

        const root = new THREE.Object3D();
        const labelBaseScale = 0.01;

        const canvas = this.makeLabelCanvas(labelWidth, fontSize, epochs);
        const texture = new THREE.CanvasTexture(canvas);

        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        const labelMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
        });
        const labels = new THREE.Sprite(labelMaterial);
        root.add(labels);

        labels.scale.x = canvas.width * labelBaseScale;
        labels.scale.y = canvas.height * labelBaseScale;

        this.camera.add(root);
        root.position.set(0, -3.5, -10);

        this.epochLabels = root;
    }

    protected initEpochSlider(): void {
        if (this.timeMax === this.timeMin || this.epochLabels === null) {
            return;
        }

        const sprite = this.epochLabels.children[0] as THREE.Sprite;

        const sliderWidth = sprite.scale.x;
        const nSteps = Math.round((this.timeMax - this.timeMin) / this._timeStep);
        const stepSize = sliderWidth / nSteps;

        let step = -(sliderWidth - 0.01) / 2;
        const positions = new Float32Array(nSteps * 3);
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = step;
            positions[i + 1] = 0;
            positions[i + 2] = 0;

            step += stepSize;
        }

        const geometry: BufferGeometry = new BufferGeometry();
        geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0xff0000,
            linewidth: 100,
        });

        const line = new THREE.Line(geometry, material);
        line.position.set(0, -sprite.scale.y / 2, 0.001);
        line.name = "slider";

        this.epochLabels.add(line);
        this.epochSlider = line;
    }

    protected initLights(): void {
        let light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, 0, this.cameraStartPosition[2] / 2);
        this.scene.add(light);

        light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, 0, -this.cameraStartPosition[2] / 2);
        this.scene.add(light);
    }

    protected initOrbitControls(): void {
        // add controls
        this.orbitControls = new OrbitControls(this.camera, document.getElementById(this.container));
        this.orbitControls.addEventListener("change", this.render.bind(this));
    }

    protected initRenderer(): void {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true, // to get smoother output
        });

        this.renderer.setClearColor(this.backgroundColor, 1);
        this.renderer.setSize(this.WIDTH, this.HEIGHT);
    }

    protected initScene(): void {
        this.scene = new Scene();
    }

    // given a timeseries for each point, min/max times, and a time step,
    // interpolate or extrapolate their values and store them in point order,
    // as opposed to time order.
    protected interpExtrapTranspose(times: number[], values: number[]): number[] {
        const interp = function (x0: number, x1: number, t0: number, t1: number, t: number): number {
            let w0: number, w1: number; // weights

            const tSpan = Math.abs(t1 - t0);
            if (tSpan < 1e-9) {
                w0 = 1;
                w1 = 0;
            } else {
                w0 = (t - t0) / tSpan;
                w1 = (t1 - t) / tSpan;
            }

            return x0 * w0 + x1 * w1;
        };

        const extrap = function(x0: number, x1: number, t0: number, t1: number, t: number): number {
            const tSpan = Math.abs(t1 - t0);
            const xSpan = x1 - x0;

            let slope: number;

            // default to constant (if x1 != x0 we have bigger problems)
            if (tSpan < 1e-9) {
                slope = 0;
            } else {
                slope = xSpan / tSpan;
            }

            return slope*(t - t1) + x1;
        };

        const newValues: number[] = [];

        const stride = times.length;
        const nPoints = values.length / stride;

        for (let t = this.timeMin; t < this.timeMax + this.timeStep; t += this.timeStep) {
            const timeIdx = _.sortedIndex(times, t);
            let val: number;

            for (let i = 0; i < nPoints; i++) {
                const valIdx = i * stride + timeIdx;

                if (timeIdx < times.length && t === times[timeIdx]) {
                    val = values[valIdx];
                } else if (timeIdx === 0) {
                    // t is smaller than our smallest time, so we need to extrapolate
                    const t0 = times[timeIdx + 1];
                    const t1 = times[timeIdx];

                    const x0 = values[valIdx + 1]
                    const x1 = values[valIdx];

                    val = extrap(x0, x1, t0, t1, t);
                } else if (timeIdx === times.length) {
                    // t is larger than our largest time, so we need to extrapolate
                    const t0 = times[timeIdx - 2];
                    const t1 = times[timeIdx - 1];

                    const x0 = values[valIdx - 2];
                    const x1 = values[valIdx - 1];

                    val = extrap(x0, x1, t0, t1, t);
                } else {
                    // 0 < timeIdx < times.length
                    const t0 = times[timeIdx - 1];
                    const t1 = times[timeIdx];

                    const x0 = i > 0 ? values[valIdx - 1] : values[valIdx];
                    const x1 = values[valIdx];

                    val = interp(x0, x1, t0, t1, t);
                }

                newValues.push(val);
            }
        }

        return newValues;
    }

    protected makeShaderMaterial(aestheticMapping: AestheticMapping): ShaderMaterial {
        const colors = [];
        let colorLUT: ColorLUT;
        if (!aestheticMapping.color || !aestheticMapping.color.colorLUT) {
            colorLUT = colorMaps.get("nothing");
        } else {
            colorLUT = aestheticMapping.color.colorLUT;
        }

        // populate lookup table
        for (let i = 0; i < colorLUT.mapping.length; i += 3) {
            const [r, g, b] = colorLUT.mapping.slice(i, i + 3);
            colors.push(new Color(r, g, b));
        }

        let colorDomain: Vector2;
        let colorTarget: Vector2;
        let colorGamma: number;
        if (aestheticMapping.color === null) {
            colorDomain = new Vector2(1, 1);
            colorTarget = new Vector2(0, 0);
            colorGamma = 1;
        } else {
            colorDomain = new Vector2(...aestheticMapping.color.transformParams.domainBounds);
            colorTarget = new Vector2(...aestheticMapping.color.transformParams.targetBounds);
            colorGamma = aestheticMapping.color.transformParams.gamma;
        }

        let opacityDomain: Vector2;
        let opacityTarget: Vector2;
        let opacityGamma: number;
        if (aestheticMapping.opacity === null) {
            opacityDomain = new Vector2(1, 1);
            opacityTarget = new Vector2(defaultOpacity, defaultOpacity);
            opacityGamma = 1;
        } else {
            opacityDomain = new Vector2(...aestheticMapping.opacity.transformParams.domainBounds);
            opacityTarget = new Vector2(...aestheticMapping.opacity.transformParams.targetBounds);
            opacityGamma = aestheticMapping.opacity.transformParams.gamma;
        }

        let radiusDomain: Vector2;
        let radiusTarget: Vector2;
        let radiusGamma: number;
        if (aestheticMapping.radius === null) {
            radiusDomain = new Vector2(1, 1);
            radiusTarget = new Vector2(defaultRadius, defaultRadius);
            radiusGamma = 1;
        } else {
            radiusDomain = new Vector2(...aestheticMapping.radius.transformParams.domainBounds);
            radiusTarget = new Vector2(...aestheticMapping.radius.transformParams.targetBounds);
            radiusGamma = aestheticMapping.radius.transformParams.gamma;
        }

        const material = new ShaderMaterial({
            uniforms: {
                pointTexture: { value: new THREE.TextureLoader().load(ballTexture) },
                colorLUT: { value: colors },
                colorData: { value: [] },
                colorDomain: { value: colorDomain },
                colorTarget: { value: colorTarget },
                colorGamma: { value: colorGamma },
                opacityDomain: { value: opacityDomain },
                opacityTarget: { value: opacityTarget },
                opacityGamma: { value: opacityGamma },
                radiusDomain: { value: radiusDomain },
                radiusTarget: { value: radiusTarget },
                radiusGamma: { value: radiusGamma },
            },
            vertexShader: pointVertexShader,
            fragmentShader: pointFragmentShader,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });

        material.defaultAttributeValues = {
            color: [0, 128/255, 1],
            opacity: defaultOpacity,
            size: defaultRadius,
            show: 1.0,
        };

        return material;
    }

    protected makeColorCanvas(height: number, baseWidth: number, fontSize: number, mapping: ColorMapping): HTMLCanvasElement {
        if (!mapping) {
            return;
        }

        const ctx = document.createElement("canvas").getContext("2d");

        const width = baseWidth + 100;
        ctx.canvas.width = width;
        ctx.canvas.height = height;

        const [domainStart, domainStop] = mapping.transformParams.domainBounds;
        const [targetStart, targetStop] = mapping.transformParams.targetBounds;
        const colorLUT = mapping.colorLUT;
        const nSteps = Math.ceil(targetStop * 255) - Math.floor(targetStart * 255);

        for (let i = Math.floor(targetStart * 255); i < Math.ceil(targetStop * 255); i++) {
            const idx = i - Math.floor(targetStart * 255);
            const startY = height - (idx + 1) * height / nSteps;

            const [r, g, b] = colorLUT.mapping.slice(3 * i, 3 * (i + 1));
            ctx.fillStyle = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
            ctx.fillRect(0, startY, baseWidth, height / nSteps);
        }

        ctx.fillStyle = "black";
        ctx.font = `${fontSize}px Helvetica`;
        ctx.fillText(domainStart.toFixed(2), baseWidth + 10, height);
        ctx.fillText(domainStop.toFixed(2), baseWidth + 10, 20);

        // scale to fit but don't stretch
        const scaleFactor = Math.min(1, baseWidth);
        ctx.translate(width / 2, height / 2);
        ctx.scale(scaleFactor, 1);

        return ctx.canvas;
    }

    protected makeLabelCanvas(baseWidth: number, fontSize: number, epochs: Epoch[]): HTMLCanvasElement {
        const ctx = document.createElement('canvas').getContext('2d');
        const font = `${fontSize}px Helvetica`;

        const width = baseWidth + 5;
        const height = fontSize + 10;
        ctx.canvas.width = width;
        ctx.canvas.height = height;
        ctx.font = font;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        // fill in epochs
        const startTime = Math.min(this.timeMin, epochs[0].bounds[0]);
        const totalTime = Math.max(this.timeMax, epochs[epochs.length - 1].bounds[1]) - startTime;

        epochs.forEach((epoch, idx) => {
            ctx.fillStyle = idx % 2 === 0 ? 'grey' : 'black';

            const startX = width * (epoch.bounds[0] - startTime) / totalTime;
            const epochWidth = width * (epoch.bounds[1] - epoch.bounds[0]) / totalTime;

            ctx.fillRect(startX, 0, epochWidth, height);

            ctx.fillStyle = 'white';
            ctx.fillText(epoch.label, (2 * startX + epochWidth) / 2, height / 2);
        });

        // scale to fit but don't stretch
        const scaleFactor = Math.min(1, height);
        ctx.translate(width / 2, height / 2);
        ctx.scale(1, scaleFactor);

        return ctx.canvas;
    }

    protected resetSlider(): void {
        this.camera.remove(this.epochLabels);

        this.initEpochLabels();
        this.initEpochSlider();
    }

    protected rgb2Hex(rgb: [number, number, number]): string {
        return `${rgb[0].toString(16)}${rgb[1].toString(16)}${rgb[2].toString(16)}`;
    }

    protected updateTimeSlider(): void {
        if (this.epochSlider === null) {
            return;
        }

        const step = (this._timeVal - this.timeMin) / this._timeStep;
        const geom = this.epochSlider.geometry as BufferGeometry;
        geom.setDrawRange(0, step);
    }

    public animate(timestamp: number = null): void {
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
        } else if (timestamp - this.lastTimestamp > 75) {
            this.lastTimestamp = timestamp;
            this.orbitControls.update();
        }

        this.render();
        this.animFrameHandle = window.requestAnimationFrame(this.animate.bind(this));
    }

    public destroy(): void {
        if (this.animFrameHandle !== null) {
            window.cancelAnimationFrame(this.animFrameHandle);
        }

        document.getElementById(this.container).removeChild(this.renderer.domElement);
    }

    public hasPenetration(penetrationId: string): boolean {
        return this.penetrationPointsMap.has(penetrationId);
    }

    public initialize(): void {
        this.initRenderer();
        this.initScene();
        this.initCamera();
        this.initLights();
        this.initOrbitControls();
        this.initEpochLabels();
        this.initEpochSlider();

        document.getElementById(this.container).appendChild(this.renderer.domElement);
    }

    public loadPenetration(penetration: Penetration): void {
        const centerPoint = volumeCenterPoint.map((t: number) => -t) as [number, number, number];
        const defaultAesthetics: AestheticMapping = {
            color: null,
            opacity: null,
            radius: null,
        };

        // fixed attributes
        const positions = new Float32Array(penetration.getXYZ().map((t) => t + 10 * (Math.random() - 0.5)));

        // mutable attributes, initialize at default
        const kolor = new Float32Array(penetration.nUnits);
        kolor.fill(0);

        const opacity = new Float32Array(penetration.nUnits);
        opacity.fill(defaultOpacity);

        const size = new Float32Array(penetration.nUnits);
        size.fill(400 * defaultRadius);

        const visible = new Float32Array(penetration.visible);

        const geometry: BufferGeometry = new BufferGeometry();
        geometry.setAttribute("show", new Float32BufferAttribute(visible, 1));
        geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
        geometry.setAttribute("kolor", new Float32BufferAttribute(kolor, 1))
        geometry.setAttribute("opacity", new Float32BufferAttribute(opacity, 1));
        geometry.setAttribute("size", new Float32BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));

        const material = this.makeShaderMaterial(defaultAesthetics);
        const points: Points<BufferGeometry> = new Points(geometry, material);
        points.position.set(...centerPoint);

        this.loadedPenetrationsMap.set(penetration.id, penetration);
        this.penetrationPointsMap.set(penetration.id, points);

        this.scene.add(points);
    }

    public render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    public clearAestheticAssignments(): void {
        this.loadedPenetrationsMap.forEach((_pen, penetrationId) => {
            this.colorData.set(penetrationId, null);
            this.opacityData.set(penetrationId, null);
            this.radiusData.set(penetrationId, null);
        });
    }

    public setAestheticAssignment(mapping: AestheticMapping, callback: Function): void {
        if (this.colorGradient) {
            this.camera.remove(this.colorGradient);
            this.colorGradient = null;
        }
        this.initColorGradient(mapping.color);

        this.loadedPenetrationsMap.forEach((penetration, penetrationId) => {
            const pointObj = this.penetrationPointsMap.get(penetrationId);
            if (!pointObj) {
                return;
            }

            pointObj.material = this.makeShaderMaterial(mapping);
            pointObj.material.needsUpdate = true;

            if (mapping.color) {
                penetration.getTimeseries(mapping.color.timeseriesId)
                    .then((data) => {
                        if (data.times) {
                            this.colorData.set(
                                penetrationId,
                                this.interpExtrapTranspose(data.times, data.values)
                            );
                            this.updatePenetrationAttributes(penetrationId, true);
                            callback();
                        }
                    });
            } else {
                callback();
            }

            if (mapping.opacity) {
                penetration.getTimeseries(mapping.opacity.timeseriesId)
                    .then((data) => {
                        if (data.times) {
                            this.opacityData.set(
                                penetrationId,
                                this.interpExtrapTranspose(data.times, data.values)
                            );
                            this.updatePenetrationAttributes(penetrationId, true);
                            callback();
                        }
                    });
            } else {
                callback();
            }

            if (mapping.radius) {
                penetration.getTimeseries(mapping.radius.timeseriesId)
                    .then((data) => {
                        if (data.times) {
                            this.radiusData.set(
                                penetrationId,
                                this.interpExtrapTranspose(data.times, data.values)
                            );
                            this.updatePenetrationAttributes(penetrationId, true);
                            callback();
                        }
                    });
            } else {
                callback();
            }
        });
    }

    public setSize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        this.HEIGHT = height;
        this.WIDTH = width;

        this.render();
    }

    public setSlicingPlanes(sliceType: SliceType, values: {center: number; offset: number}): void {
        this.removeSlicingPlanes();

        this.slicingPlanes = new SlicingPlanes(sliceType);
        this.slicingPlanes.setCoordinateOffset(values);

        this.scene.add(...this.slicingPlanes.planes);
    }

    public removeSlicingPlanes(): void {
        if (this.slicingPlanes) {
            this.scene.remove(...this.slicingPlanes.planes);

            this.slicingPlanes = null;
        }
    }

    public setTomographySlice(slice: TomographySlice): void {
        if (!slice) {
            return;
        }

        if (this.tomographySlice !== null && this.tomographySlice.mesh) {
            this.scene.remove(this.tomographySlice.mesh);
        }

        this.tomographySlice = slice;
        if (slice.mesh) {
            this.scene.add(slice.mesh);
        }
    }

    public removeTomographySlice(): void {
        if (this.tomographySlice) {
            this.scene.remove(this.tomographySlice.mesh);
            this.tomographySlice = null;
        }
    }

    public updateSliceTexture(sliceImageType: SliceImageType): void {
        if (this.tomographySlice) {
            this.tomographySlice.imageType = sliceImageType;
        }
    }

    public lockToPlane(): void {
        if (!this.tomographySlice) {
            return;
        }

        let cameraCoords: [number, number, number];
        const coordinate = this.tomographySlice.coordinate;

        switch (this.sliceType) {
            case SliceType.CORONAL:
                cameraCoords = [coordinate - CoronalMax / 2 - 10000, 0, 0];
                break;
            case SliceType.SAGITTAL:
                cameraCoords = [0, 0, coordinate - SagittalMax / 2 - 15000];
                break;
        }

        if (cameraCoords) {
            this.camera.position.set(...cameraCoords);
            this.camera.lookAt(0, 0, 0);
            this.orbitControls.enableRotate = false;
            this.render();
        }
    }

    public unlockFromPlane(): void {
        this.orbitControls.enableRotate = true;
        this.render();
    }

    public projectToPlane(): void {
        this.penetrationPointsMap.forEach((points, penetrationId) => {
            const penetration = this.loadedPenetrationsMap.get(penetrationId);
            if (!penetration || !this.tomographySlice) {
                return;
            }

            const geometry = points.geometry
            const position3 = penetration.getXYZ();
            const position2 = new Float32Array(position3.length);
            switch (this.sliceType) {
                case SliceType.CORONAL:
                    for (let i = 0; i < position3.length; i += 3) {
                        position2[i] = this.tomographySlice.coordinate;
                        position2[i + 1] = position3[i + 1];
                        position2[i + 2] = position3[i + 2];
                    }
                    break;
                case SliceType.SAGITTAL:
                    for (let i = 0; i < position3.length; i += 3) {
                        position2[i] = position3[i];
                        position2[i + 1] = position3[i + 1];
                        position2[i + 2] = this.tomographySlice.coordinate;
                    }
                    break;
            }
            geometry.attributes.position = new Float32BufferAttribute(position2, 3);
            (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        });
    }

    public undoProjectToPlane(): void {
        this.penetrationPointsMap.forEach((points, penetrationId) => {
            const penetration = this.loadedPenetrationsMap.get(penetrationId);
            if (!penetration) {
                return;
            }

            const geometry = points.geometry;
            const position3 = new Float32Array(penetration.getXYZ());
            geometry.setAttribute("position", new Float32BufferAttribute(position3, 3));
            (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        });
    }

    public setTime(timeMin: number, timeMax: number, timeStep: number, timeVal: number): void {
        this.timeMin = timeMin;
        this.timeMax = timeMax;
        this._timeStep = timeStep;

        this.resetSlider();

        this.timeVal = timeVal;
    }

    public updatePenetrationAttributes(penetrationId: string, render?: boolean): void {
        const penetration = this.loadedPenetrationsMap.get(penetrationId);
        const pointObj = this.penetrationPointsMap.get(penetrationId);
        if (!penetration || !pointObj) {
            return;
        }

        const t = this._timeVal;
        const timeIdx = Math.floor((t - this.timeMin) / this.timeStep);

        const nPoints = pointObj.geometry.attributes.position.array.length / 3;

        const colorData = this.colorData.get(penetrationId);
        let kolor: Float32Array;
        if (colorData) {
            kolor = new Float32Array(colorData.slice(nPoints * timeIdx, nPoints * (timeIdx + 1)));
            // colorData = new Float32Array(colorData)
        } else {
            kolor = new Float32Array(nPoints);
            kolor.fill(0);
        }

        const opacityData = this.opacityData.get(penetrationId);
        let opacities: Float32Array;
        if (opacityData) {
            opacities = new Float32Array(opacityData.slice(nPoints * timeIdx, nPoints * (timeIdx + 1)));
        } else {
            opacities = new Float32Array(nPoints);
            opacities.fill(defaultOpacity);
        }

        const radiusData = this.radiusData.get(penetrationId);
        let sizes: Float32Array;
        if (radiusData) {
            sizes = new Float32Array(radiusData.slice(nPoints * timeIdx, nPoints * (timeIdx + 1)));
        } else {
            sizes = new Float32Array(nPoints);
            sizes.fill(defaultRadius);
        }

        const visible = penetration.visible;

        const geom = pointObj.geometry;
        geom.attributes.kolor = new Float32BufferAttribute(kolor, 1);
        geom.attributes.kolor.needsUpdate = true;

        geom.attributes.opacity = new Float32BufferAttribute(opacities, 1);
        geom.attributes.opacity.needsUpdate = true;

        geom.attributes.size = new Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage);
        geom.attributes.size.needsUpdate = true;

        geom.attributes.show = new Float32BufferAttribute(visible, 1);
        geom.attributes.show.needsUpdate = true;

        if (render) {
            this.render();
        }
    }

    public updateAllPenetrationAttributes(): void {

        this.penetrationPointsMap.forEach((_obj, penetrationId) => {
            this.updatePenetrationAttributes(penetrationId, false);
        });

        this.render();
    }

    public get timeStep(): number {
        return this._timeStep;
    }

    public set timeVal(t: number) {
        this._timeVal = t;
        this.updateAllPenetrationAttributes();
        this.updateTimeSlider();
    }

    public get sliceType(): SliceType {
        return this.tomographySlice ?
            this.tomographySlice.sliceType :
            null;
    }

    public set imageType(imageType: SliceImageType) {
        if (this.tomographySlice) {
            this.tomographySlice.imageType = imageType;
        }
    }

    private loadCompartment(compartmentNode: CompartmentNode): void {
        const name = compartmentNode.name;
        if (this.loadedCompartments.has(name)) {
            return;
        }

        const compartmentId = compartmentNode.id;
        const compartmentColor = '#' + this.rgb2Hex(compartmentNode.rgbTriplet);

        const loader = new THREE.OBJLoader();
        const path = `${apiEndpoint}/mesh/${compartmentId}`;

        loader.load(path, (obj: Object3D) => {
            const makeMaterial = (child: Mesh): void => {
                child.material = new ShaderMaterial({
                    uniforms: {
                        color: {
                            value: new THREE.Color(compartmentColor)
                        },
                    },
                    vertexShader: compartmentVertexShader,
                    fragmentShader: compartmentFragmentShader,
                    transparent: true,
                    depthTest: true,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                });
            };

            obj.traverse(makeMaterial.bind(this))

            obj.name = name;
            const [x, y, z] = volumeCenterPoint.map((t: number) => -t);
            obj.position.set(x, y, z);

            this.loadedCompartments.add(name);

            this.scene.add(obj);

            // user can select and unselect before the compartment has a chance to load
            if (!this.visibleCompartments.has(name)) {
                obj.visible = false;
            }
        });
    }

    public hideAllCompartments(): void {
        this.visibleCompartments.forEach((name) => {
            const compartment = this.scene.getObjectByName(name);
            compartment.visible = false;
        });

        this.visibleCompartments.clear();
    }

    public setCompartmentVisible(compartmentNode: CompartmentNode, visible: boolean): void {
        // loading sets visible as a side effect
        const name = compartmentNode.name;

        if (visible) {
            this.visibleCompartments.add(name);
        } else {
            this.visibleCompartments.delete(name)
        }

        if (visible && !this.loadedCompartments.has(name)) {
            this.loadCompartment(compartmentNode);
        }
        const compartmentObj = this.scene.getObjectByName(name);

        if (compartmentObj) {
            compartmentObj.visible = visible;
        }
    }
}
