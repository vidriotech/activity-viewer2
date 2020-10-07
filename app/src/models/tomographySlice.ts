import {
    ClampToEdgeWrapping,
    DoubleSide,
    Geometry,
    LinearFilter,
    Material,
    Mesh,
    MeshBasicMaterial,
    PlaneGeometry,
    Texture,
    TextureLoader
} from "three";

// eslint-disable-next-line import/no-unresolved
import {SliceData} from "./apiModels";
// eslint-disable-next-line import/no-unresolved
import {SliceImageType, SliceType} from "./enums";
// eslint-disable-next-line import/no-unresolved
import {CoronalMax, HorizontalMax, SagittalMax} from "../constants";

export class TomographySlice {
    private readonly _sliceType: SliceType;
    private readonly geometry: Geometry;

    private texture: Texture;
    private _mesh: Mesh;

    protected annotationImage: string;
    protected templateImage: string;

    protected pixelAnnotations: number[];

    protected stride: number;
    protected _coordinate: number;

    public _imageType: SliceImageType;

    constructor(sliceType: SliceType) {
        this._sliceType = sliceType;

        // geometry
        let width: number, height: number;
        switch (this._sliceType) {
            case SliceType.CORONAL:
                width = SagittalMax;
                height = HorizontalMax;
                break;
            case SliceType.SAGITTAL:
                width = CoronalMax;
                height = HorizontalMax;
                break;
        }

        this.geometry = new PlaneGeometry(width, height, 32);
        if (this._sliceType === SliceType.CORONAL) {
            this.geometry.rotateY(Math.PI / 2);
        }
    }

    private async makeMesh(): Promise<void> {
        let imageData: string = null;

        if (this._imageType === SliceImageType.ANNOTATION && this.annotationImage) {
            imageData = this.annotationImage;
        } else if (this._imageType === SliceImageType.TEMPLATE && this.templateImage) {
            imageData = this.templateImage;
        } else {
            return;
        }

        const loadTexture = (texture: Texture) => {
            this.texture = texture;

            texture.minFilter = LinearFilter;
            texture.wrapS = ClampToEdgeWrapping;
            texture.wrapT = ClampToEdgeWrapping;
            texture.flipY = this._sliceType === SliceType.SAGITTAL;

            // material
            const material = TomographySlice.makeMaterial(texture);

            // mesh
            if (!this._mesh) {
                this._mesh = new Mesh(this.geometry, material);
            } else {
                this._mesh.material = material;
                this._mesh.material.needsUpdate = true;
            }

            switch(this._sliceType) {
                case SliceType.CORONAL:
                    this._mesh.position.set(
                        this._coordinate - CoronalMax / 2,
                        0,
                        0
                    );
                    break;
                case SliceType.SAGITTAL:
                    this._mesh.position.set(
                        0,
                        0,
                        this._coordinate - SagittalMax / 2
                    );
                    break;
            }
        };

        const loader = new TextureLoader();
        return new Promise((resolve) => {
            loader.load(imageData, (texture) => resolve(loadTexture(texture)));
        });
    }

    public static async fromResponse(sliceData: SliceData): Promise<TomographySlice> {
        const s = new TomographySlice(sliceData.sliceType);

        s.annotationImage = sliceData.annotationImage;
        s.templateImage = sliceData.templateImage;
        s.pixelAnnotations = sliceData.annotationSlice;
        s.stride = sliceData.stride;
        s._coordinate = sliceData.coordinate;
        s._imageType = SliceImageType.ANNOTATION;

        return s.makeMesh()
            .then(() => s);
    }

    public static makeMaterial(texture: Texture): Material {
        return new MeshBasicMaterial({
            map: texture,
            alphaTest: 0.5,
            color: 0xffffff,
            side: DoubleSide,
            transparent: false,
            depthTest: true,
        });
    }

    public get coordinate(): number {
        return this._coordinate;
    }

    public get mesh(): Mesh {
        return this._mesh;
    }

    public get imageType(): SliceImageType {
        return this._imageType;
    }

    public set imageType(imageType: SliceImageType) {
        if (imageType === this._imageType) {
            return;
        }

        this._imageType = imageType;
        this.makeMesh();
    }

    public get sliceType(): SliceType {
        return this._sliceType;
    }
}
