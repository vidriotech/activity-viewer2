import {BufferAttribute, Mesh} from "three";

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../constants"

// eslint-disable-next-line import/no-unresolved
import {Epoch, PenetrationData, SliceImageData, SliceType} from "../models/apiModels";

// eslint-disable-next-line import/no-unresolved
import {BaseViewer} from "./baseViewer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const THREE = require("three");

export type ImageType = "annotation" | "template";

export class SliceViewer extends BaseViewer {
    private _imageType: ImageType = "annotation";
    private sliceData: SliceImageData = null;
    private slice: Mesh = null;

    constructor(constants: AVConstants, epochs: Epoch[], sliceData: SliceImageData) {
        super(constants, epochs);

        this.pointsMaterial = new THREE.ShaderMaterial({
            uniforms: {
                pointTexture: { value: new THREE.TextureLoader().load(this.constants.discTexture) }
            },
            vertexShader: this.constants.pointVertexShader,
            fragmentShader: this.constants.pointFragmentShader,
            depthTest: false,
            transparent: true,
            vertexColors: true
        });

        this.cameraPosition = [0, 0, -15000];

        this.sliceData = sliceData;
    }

    private initSlice(): void {
        const loader = new THREE.TextureLoader();
        const imgData = this._imageType === "annotation" ?
            this.sliceData.annotationImage :
            this.sliceData.templateImage;

        loader.load(imgData, (texture: THREE.Texture) => {
            let width: number, height: number;
            switch (this.sliceType) {
                case "coronal":
                    width = this.constants.SagittalMax;
                    height = this.constants.HorizontalMax;
                    break;
                case "sagittal":
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
            texture.flipY = this.sliceType === "sagittal";

            const slice = new Mesh(geometry, material);
            this.scene.add(slice);

            this.slice = slice;
        });
    }

    public loadPenetration(penetrationData: PenetrationData): void {
        super.loadPenetration(penetrationData);

        const penetrationId = penetrationData.penetrationId;
        const penetration = this.penetrationPointsMap.get(penetrationId);
        const geometry = penetration.geometry;
        const position3 = geometry.getAttribute("position").array;
        const position2 = new Float32Array(position3.length);

        switch (this.sliceType) {
            case "coronal":
                for (let i = 0; i < position3.length; i += 3) {
                    position2[i] = position3[i + 2]; // swap out x and z
                    position2[i + 1] = position3[i + 1];
                    position2[i + 2] = this.constants.CoronalMax / 2;
                }
                break;
            case "sagittal":
                for (let i = 0; i < position3.length; i += 3) {
                    position2[i] = position3[i];
                    position2[i + 1] = position3[i + 1];
                    position2[i + 2] = this.constants.SagittalMax / 2; // x and y map correctly
                }
                break;
        }

        geometry.attributes.position = new THREE.Float32BufferAttribute(position2, 3);
        (geometry.attributes.position as BufferAttribute).needsUpdate = true;
    }

    public initialize(): void {
        super.initialize();
        this.initSlice();

        this.orbitControls.enableRotate = false;
    }

    public get sliceType(): SliceType {
        return this.sliceData.sliceType;
    }

    public set imageType(val: ImageType) {
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
