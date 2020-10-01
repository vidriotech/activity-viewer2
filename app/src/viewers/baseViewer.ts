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
    PointsMaterial,
    Scene,
    ShaderMaterial,
    Vector2,
    WebGLRenderer
} from "three";

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../constants";

// eslint-disable-next-line import/no-unresolved
import {AestheticMapping} from "../models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {Epoch, PenetrationData, SliceData} from "../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {ColorLUT} from "../models/colorMap";

// eslint-disable-next-line import/no-unresolved
import {SliceImageType, SliceType} from "../models/enums";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const THREE = require("three");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OrbitControls = require("ndb-three-orbit-controls")(THREE);

export abstract class BaseViewer {
    protected constants: AVConstants;
    protected epochs: Epoch[];
    protected aestheticMappings: Map<string, AestheticMapping>;

    // animation
    protected animFrameHandle: number = null;
    protected timeMax = 0;
    protected timeMin = 0;
    protected _timeStep = 0.01;
    protected _timeVal = 0;

    public HEIGHT: number;
    public WIDTH: number;
    public container = 'container';

    protected backgroundColor = 0xffffff;
    protected cameraPosition: [number, number, number];
    protected fov = 45;

    protected renderer: WebGLRenderer = null;
    protected scene: Scene = null;
    protected camera: PerspectiveCamera = null;
    protected orbitControls: any = null;

    protected lastTimestamp: number = null;

    protected pointsMaterial: PointsMaterial;
    protected epochLabels: Object3D = null;
    protected epochSlider: Line = null;

    protected penetrationPointsMap: Map<string, Points<BufferGeometry>>;

    protected colorData: Map<string, number[]>;
    protected colorDomain: Vector2;
    protected colorTarget: Vector2;
    protected colorGamma: number;

    protected opacityData: Map<string, number[]>;
    protected opacityDomain: Vector2;
    protected opacityTarget: Vector2;
    protected opacityGamma: number;

    protected radiusData: Map<string, number[]>;
    protected radiusDomain: Vector2;
    protected radiusTarget: Vector2;
    protected radiusGamma: number;

    public flip = true; // flip y axis

    private _imageType: SliceImageType = SliceImageType.ANNOTATION;
    protected sliceData: SliceData = null;
    private slice: Mesh = null;

    protected constructor(constants: AVConstants, epochs: Epoch[]) {
        this.constants = constants;
        this.epochs = epochs.sort((e1, e2) => e1.bounds[0] - e2.bounds[0]);
        this.cameraPosition = [0, 0, 0];

        this.pointsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: new THREE.TextureLoader().load(this.constants.ballTexture) }
            },
            vertexShader: this.constants.pointVertexShader,
            fragmentShader: this.constants.pointFragmentShader,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });

        this.colorData = new Map<string, number[]>();
        this.colorDomain = new Vector2(0, 1);
        this.colorTarget = new Vector2(0, 1);
        this.colorGamma = 1;

        this.opacityData = new Map<string, number[]>();
        this.opacityDomain = new Vector2(0.01, 1);
        this.opacityTarget = new Vector2(0.01, 1);
        this.opacityGamma = 1;

        this.radiusData = new Map<string, number[]>();
        this.radiusDomain = new Vector2(0.01, 1);
        this.radiusTarget = new Vector2(0.01, 1);
        this.radiusGamma = 1;

        this.penetrationPointsMap = new Map<string, Points<BufferGeometry>>();
        this.aestheticMappings = new Map<string, AestheticMapping>();
    }

    protected initCamera(): void {
        const cameraPosition = this.cameraPosition[2];
        this.camera = new THREE.PerspectiveCamera(this.fov, this.WIDTH / this.HEIGHT, 1, cameraPosition * 5);
        this.scene.add(this.camera);
        this.camera.position.set(...this.cameraPosition);

        if (this.flip) {
            this.camera.up.setY(-1);
        }
    }

    protected initEpochLabels(): void {
        if (this.epochs.length === 0) {
            return null;
        }

        const labelWidth = 1200;
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
        light.position.set(0, 0, this.cameraPosition[2] / 2);
        this.scene.add(light);

        light = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, 0, -this.cameraPosition[2] / 2);
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
        if (aestheticMapping.color === null || !aestheticMapping.color.colorLUT) {
            colorLUT = this.constants.defaultColorLUT;
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
            opacityTarget = new Vector2(this.constants.defaultOpacity, this.constants.defaultOpacity);
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
            radiusTarget = new Vector2(this.constants.defaultRadius, this.constants.defaultRadius);
            radiusGamma = 1;
        } else {
            radiusDomain = new Vector2(...aestheticMapping.radius.transformParams.domainBounds);
            radiusTarget = new Vector2(...aestheticMapping.radius.transformParams.targetBounds);
            radiusGamma = aestheticMapping.radius.transformParams.gamma;
        }

        const material = new ShaderMaterial({
            uniforms: {
                pointTexture: { value: new THREE.TextureLoader().load(this.constants.ballTexture) },
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
            vertexShader: this.constants.pointVertexShader,
            fragmentShader: this.constants.pointFragmentShader,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });

        material.defaultAttributeValues = {
            color: [0, 128/255, 1],
            opacity: this.constants.defaultOpacity,
            size: this.constants.defaultRadius,
            show: 1.0,
        };

        return material;
    }

    protected makeLabelCanvas(baseWidth: number, fontSize: number, epochs: Epoch[]): HTMLCanvasElement {
        const borderSize = 2;
        const ctx = document.createElement('canvas').getContext('2d');
        const font = `${fontSize}px sans-serif`;
        ctx.font = font;
        // measure how long the name will be
        const textWidth = ctx.measureText(name).width;

        const doubleBorderSize = borderSize * 2;
        const width = baseWidth + doubleBorderSize;
        const height = fontSize + doubleBorderSize;
        ctx.canvas.width = width;
        ctx.canvas.height = height;

        // need to set font again after resizing canvas
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
        const scaleFactor = Math.min(1, baseWidth / textWidth);
        ctx.translate(width / 2, height / 2);
        ctx.scale(scaleFactor, 1);

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

    public loadPenetration(penetrationData: PenetrationData): void {
        const nPoints = penetrationData.ids.length;
        const centerPoint = this.constants.centerPoint.map((t: number) => -t) as [number, number, number];
        const defaultAesthetics: AestheticMapping = {
            penetrationId: penetrationData.penetrationId,
            color: null,
            opacity: null,
            radius: null,
            show: null,
        };

        // fixed attributes
        const positions = new Float32Array(penetrationData.coordinates.map(t => t + 10 * (Math.random() - 0.5)));

        // mutable attributes, initialize at default
        const kolor = new Float32Array(nPoints);
        kolor.fill(0);

        const opacity = new Float32Array(nPoints);
        opacity.fill(this.constants.defaultOpacity);

        const size = new Float32Array(nPoints);
        size.fill(400 * this.constants.defaultRadius);

        const visible = new Float32Array(penetrationData.selected.map((v) => Number(v)));
        // const visible = new Float32Array(nPoints);
        // visible.fill(0.99);

        const geometry: BufferGeometry = new BufferGeometry();
        geometry.setAttribute("show", new Float32BufferAttribute(visible, 1));
        geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
        geometry.setAttribute("kolor", new Float32BufferAttribute(kolor, 1))
        geometry.setAttribute("opacity", new Float32BufferAttribute(opacity, 1));
        geometry.setAttribute("size", new Float32BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));

        const material = this.makeShaderMaterial(defaultAesthetics);
        const penetration: Points<BufferGeometry> = new Points(geometry, material);
        penetration.position.set(...centerPoint);

        this.penetrationPointsMap.set(penetrationData.penetrationId, penetration);
        this.aestheticMappings.set(penetrationData.penetrationId, defaultAesthetics);

        this.scene.add(penetration);
    }

    public render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    public setAestheticAssignments(mappings: AestheticMapping[]): void {
        mappings.forEach((mapping) => {
            const penetrationId = mapping.penetrationId;

            if (mapping.color !== null && mapping.color.timeseriesData.times !== null) {
                const times = mapping.color.timeseriesData.times;
                const values = mapping.color.timeseriesData.values;

                this.colorData.set(
                    penetrationId,
                    this.interpExtrapTranspose(times, values)
                );
            } else {
                this.colorData.set(penetrationId, null);
            }

            if (mapping.opacity !== null && mapping.opacity.timeseriesData.times !== null) {
                const times = mapping.opacity.timeseriesData.times;
                const values = mapping.opacity.timeseriesData.values;
                this.opacityData.set(
                    penetrationId,
                    this.interpExtrapTranspose(times, values)
                );
            } else {
                this.opacityData.set(penetrationId, null);
            }

            if (mapping.radius !== null && mapping.radius.timeseriesData.times !== null) {
                const times = mapping.radius.timeseriesData.times;
                const values = mapping.radius.timeseriesData.values;
                this.radiusData.set(
                    penetrationId,
                    this.interpExtrapTranspose(times, values)
                );
            } else {
                this.radiusData.set(penetrationId, null);
            }

            this.aestheticMappings.set(penetrationId, mapping);

            const pointObj = this.penetrationPointsMap.get(penetrationId);
            pointObj.material = this.makeShaderMaterial(mapping);
            pointObj.material.needsUpdate = true;
        });

        this.updatePenetrationAttributes();
    }

    public setSize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);

        this.HEIGHT = height;
        this.WIDTH = width;

        this.render();
    }

    public setTime(timeMin: number, timeMax: number, timeStep: number, timeVal: number): void {
        this.timeMin = timeMin;
        this.timeMax = timeMax;
        this._timeStep = timeStep;

        this.resetSlider();

        this.timeVal = timeVal;
    }

    public updatePenetrationAttributes(): void {
        const t = this._timeVal;
        const timeIdx = Math.floor((t - this.timeMin) / this.timeStep);

        this.penetrationPointsMap.forEach((pointObj, penetrationId) => {
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
                opacities.fill(this.constants.defaultOpacity);
            }

            const radiusData = this.radiusData.get(penetrationId);
            let sizes: Float32Array;
            if (radiusData) {
                sizes = new Float32Array(radiusData.slice(nPoints * timeIdx, nPoints * (timeIdx + 1)));
            } else {
                sizes = new Float32Array(nPoints);
                sizes.fill(this.constants.defaultRadius);
            }

            const mapping = this.aestheticMappings.get(penetrationId);
            const visible = new Float32Array(mapping.show);

            const geom = pointObj.geometry;
            geom.attributes.kolor = new Float32BufferAttribute(kolor, 1);
            geom.attributes.kolor.needsUpdate = true;

            geom.attributes.opacity = new Float32BufferAttribute(opacities, 1);
            geom.attributes.opacity.needsUpdate = true;

            geom.attributes.size = new Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage);
            geom.attributes.size.needsUpdate = true;

            geom.attributes.show = new Float32BufferAttribute(visible, 1);
            geom.attributes.show.needsUpdate = true;
        });

        this.render();
    }

    public get timeStep(): number {
        return this._timeStep;
    }

    public set timeVal(t: number) {
        this._timeVal = t;
        this.updatePenetrationAttributes();
        this.updateTimeSlider();
    }

    protected initSlice(): void {
        const loader = new THREE.TextureLoader();
        const imgData = this._imageType === SliceImageType.ANNOTATION ?
            this.sliceData.annotationImage :
            this.sliceData.templateImage;

        loader.load(imgData, (texture: THREE.Texture) => {
            let width: number, height: number;
            switch (this.sliceType) {
                case SliceType.CORONAL:
                    width = this.constants.SagittalMax;
                    height = this.constants.HorizontalMax;
                    break;
                case SliceType.SAGITTAL:
                    width = this.constants.CoronalMax;
                    height = this.constants.HorizontalMax;
                    break;
            }

            const geometry = new THREE.PlaneBufferGeometry(width, height);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true,
            });

            texture.minFilter = THREE.LinearFilter;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.flipY = this.sliceType === SliceType.SAGITTAL;

            const slice = new Mesh(geometry, material);
            this.scene.add(slice);

            this.slice = slice;
        });
    }

    public get sliceType(): SliceType {
        return this.sliceData ?
            this.sliceData.sliceType :
            null;
    }

    public set imageType(val: SliceImageType) {
        if (val != this._imageType) {
            this._imageType = val;

            if (this.slice !== null) {
                this.scene.remove(this.slice);
                this.slice = null;

                this.initSlice();
            }
        }
    }
}
