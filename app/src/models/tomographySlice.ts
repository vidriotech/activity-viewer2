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
// eslint-disable-next-line import/no-unresolved
import {SliceImageType, SliceType} from "./enums";
// eslint-disable-next-line import/no-unresolved
import {apiEndpoint, CoronalMax, HorizontalMax, SagittalMax} from "../constants";

export class TomographySlice {
    private readonly _sliceType: SliceType;
    private readonly geometry: Geometry;

    private _annotationTexture: Texture;
    private _templateTexture: Texture;
    private _mesh: Mesh;

    protected _coordinate: number;
    public _imageType: SliceImageType;

    constructor(sliceType: SliceType, coordinate: number) {
        this._sliceType = sliceType;
        this._coordinate = coordinate;

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

    private makeTextureFromImageUri(filePath: string): Promise<Texture> {
        const loadTexture = (texture: Texture): Texture => {
            texture.minFilter = LinearFilter;
            texture.wrapS = ClampToEdgeWrapping;
            texture.wrapT = ClampToEdgeWrapping;
            texture.flipY = this._sliceType === SliceType.SAGITTAL;

            return texture;
        }

        const loader = new TextureLoader();
        return new Promise((resolve) => {
            loader.load(filePath, (texture) => resolve(loadTexture(texture)));
        });
    }

    public async initialize(): Promise<void> {
        const sliceType = this._sliceType === SliceType.CORONAL ? "c" : "s";
        const truncatedCoord = 10 * Math.floor(this._coordinate / 10);

        const annotationImageUri = `${apiEndpoint}/images/a${sliceType}${truncatedCoord}.png`;
        const templateImageUri = `${apiEndpoint}/images/t${sliceType}${truncatedCoord}.png`;

        return this.makeTextureFromImageUri(annotationImageUri)
            .then((texture) => {
                this._annotationTexture = texture;
            })
            .then(() => {
                return this.makeTextureFromImageUri(templateImageUri);
            })
            .then((texture) => {
                this._templateTexture = texture;
            })
            .then(() => {
                // material
                let material: Material;
                switch (this._imageType) {
                    case SliceImageType.ANNOTATION:
                        material = TomographySlice.makeMaterial(this._annotationTexture);
                        break;
                    case SliceImageType.TEMPLATE:
                        material = TomographySlice.makeMaterial(this._templateTexture);
                        break;
                }

                // mesh
                const mesh = new Mesh(this.geometry, material);

                switch(this._sliceType) {
                    case SliceType.CORONAL:
                        mesh.position.set(
                            this._coordinate - CoronalMax / 2,
                            0,
                            0
                        );
                        break;
                    case SliceType.SAGITTAL:
                        mesh.position.set(
                            0,
                            0,
                            this._coordinate - SagittalMax / 2
                        );
                        break;
                }

                this._mesh = mesh;
            });
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
        switch (this._imageType) {
            case SliceImageType.ANNOTATION:
                this._mesh.material = TomographySlice.makeMaterial(this._annotationTexture);
                break;
            case SliceImageType.TEMPLATE:
                this._mesh.material = TomographySlice.makeMaterial(this._templateTexture);
                break;
        }
    }

    public get sliceType(): SliceType {
        return this._sliceType;
    }
}
