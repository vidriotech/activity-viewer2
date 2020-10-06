import {DoubleSide, Geometry, Material, Mesh, MeshBasicMaterial, PlaneGeometry} from "three";

// eslint-disable-next-line import/no-unresolved
import {SliceType} from "./enums";
// eslint-disable-next-line import/no-unresolved
import {CoronalMax, HorizontalMax, SagittalMax} from "../constants";

enum PlaneType {
    CENTER,
    BOUNDARY,
}

export class SlicingPlanes {
    private readonly _sliceType: SliceType;
    private readonly geometry: Geometry;
    private _centerPlane: Mesh;
    private _negativePlane: Mesh;
    private _positivePlane: Mesh;

    private _centerCoordinate: number;
    private _boundaryOffset: number;

    constructor(sliceType: SliceType) {
        this._sliceType = sliceType;
        this._boundaryOffset = 500;

        // geometry
        let planeWidth: number, planeHeight: number;
        switch (this._sliceType) {
            case SliceType.CORONAL:
                this._centerCoordinate = CoronalMax / 2;
                planeWidth = SagittalMax;
                planeHeight = HorizontalMax;
                break;
            case SliceType.SAGITTAL:
                this._centerCoordinate = SagittalMax / 2;
                planeWidth = CoronalMax;
                planeHeight = HorizontalMax;
                break;
        }

        this.geometry = new PlaneGeometry(planeWidth, planeHeight, 32);
        if (this._sliceType === SliceType.CORONAL) {
            this.geometry.rotateY(Math.PI / 2);
        }

        this.makeMeshes();
    }

    private makeMeshes(): void {
        const centerPlaneMaterial = SlicingPlanes.makeMaterial(PlaneType.CENTER);
        this._centerPlane = new Mesh(this.geometry, centerPlaneMaterial);

        const boundaryPlaneMaterial = SlicingPlanes.makeMaterial(PlaneType.BOUNDARY);
        this._negativePlane = new Mesh(this.geometry, boundaryPlaneMaterial);
        this._positivePlane = new Mesh(this.geometry, boundaryPlaneMaterial);

        this.setCoordinateOffset({center: this._centerCoordinate, offset: this._boundaryOffset});
    }

    public static makeMaterial(planeType: PlaneType): Material {
        const color = planeType === PlaneType.CENTER ?
            0x1f77b4 :
            0xff7f0e;

        return new MeshBasicMaterial({
            color: color,
            alphaTest: 0.5,
            side: DoubleSide,
            transparent: true,
            depthTest: true,
        });
    }

    public setCoordinateOffset(values: {center: number; offset: number}): void {
        let centerCoordinates: [number, number, number];
        let negativeCoordinates: [number, number, number];
        let positiveCoordinates: [number, number, number];

        this._centerCoordinate = values.center;
        this._boundaryOffset = values.offset;

        switch (this._sliceType) {
            case SliceType.CORONAL:
                centerCoordinates = [
                    this._centerCoordinate - CoronalMax / 2,
                    0,
                    0
                ];
                negativeCoordinates = [
                    Math.max(
                        this._centerCoordinate - CoronalMax / 2 - this._boundaryOffset,
                        -CoronalMax / 2
                    ),
                    0,
                    0
                ];
                positiveCoordinates = [
                    Math.min(
                        this._centerCoordinate - CoronalMax / 2 + this._boundaryOffset,
                        CoronalMax / 2
                    ),
                    0,
                    0
                ];
                break;
            case SliceType.SAGITTAL:
                centerCoordinates = [
                    0,
                    0,
                    this._centerCoordinate - SagittalMax / 2
                ];
                negativeCoordinates = [
                    0,
                    0,
                    Math.max(
                        this._centerCoordinate - SagittalMax / 2 - this._boundaryOffset,
                        -SagittalMax / 2
                    )
                ];
                positiveCoordinates = [
                    0,
                    0,
                    Math.min(
                        this._centerCoordinate - SagittalMax / 2 + this._boundaryOffset,
                        SagittalMax / 2
                    )
                ];
                break;
        }

        this._centerPlane.position.set(...centerCoordinates);
        this._negativePlane.position.set(...negativeCoordinates);
        this._positivePlane.position.set(...positiveCoordinates);
    }

    public get planes(): [Mesh, Mesh, Mesh] {
        return [this.centerPlane, this.negativePlane, this.positivePlane];
    }

    public get centerPlane(): Mesh {
        return this._centerPlane;
    }

    public get negativePlane(): Mesh {
        return this._negativePlane;
    }

    public get positivePlane(): Mesh {
        return this._positivePlane;
    }
}