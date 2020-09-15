// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../constants"

// eslint-disable-next-line import/no-unresolved
import {Epoch, PenetrationData, SliceImageData} from "../models/apiModels";

// eslint-disable-next-line import/no-unresolved
import {BaseViewer} from "./baseViewer";
import {BufferAttribute} from "three";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const THREE = require("three");

type SliceType = "coronal" | "sagittal" | "horizontal";

export class SliceViewer extends BaseViewer {
    private sliceData: SliceImageData = null;
    private sliceType: SliceType;

    constructor(constants: AVConstants, epochs: Epoch[]) {
        super(constants, epochs);

        this.cameraPosition = [0, 0, -15000];

        this.sliceType = "coronal";
        this.sliceData = {
            annotationImage: "data:image/png;base64,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",
            templateImage: "",
            stride: 456,
            annotationSlice: [],
        };
    }

    private initSlice(): void {
        const loader = new THREE.TextureLoader();
        loader.load(this.sliceData.annotationImage, (texture: THREE.Texture) => {
            let width: number, height: number;
            switch (this.sliceType) {
                case "coronal":
                    width = this.constants.SagittalMax;
                    height = this.constants.HorizontalMax;
                    break;
                case "horizontal":
                    width = this.constants.CoronalMax;
                    height = this.constants.SagittalMax;
                    break;
                case "sagittal":
                    width = this.constants.CoronalMax;
                    height = this.constants.HorizontalMax;
                    break;
            }

            const geometry = new THREE.PlaneBufferGeometry(width, height);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide
            });

            texture.minFilter = THREE.LinearFilter;
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.flipY = false;

            const mesh = new THREE.Mesh(geometry, material);
            this.scene.add(mesh);
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
            case "horizontal":
                for (let i = 0; i < position3.length; i += 3) {
                    position2[i] = position3[i + 2]; // x gets z
                    position2[i + 1] = position3[i]; // y gets x
                    position2[i + 2] = this.constants.HorizontalMax / 2;
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
}
