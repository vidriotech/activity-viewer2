import { IPoint } from '../models/pointModel';

export class PointViewModel {
    private visible: boolean;
    private point: IPoint;
    private _alpha: number;
    private _color: number;
    private _radius: number;
    private timestep: number;
    private nTimesteps: number;

    public constructor(point: IPoint) {
        this.point = point;

        // initialize values to first timestep or defaults
        this._alpha = this.point.hasOwnProperty('alpha') ? this.point.alpha[0] : 1.0;
        this._color = this.point.hasOwnProperty('color') ? this.point.color[0] : 0x0080ff;
        this._radius = this.point.hasOwnProperty('radius') ? this.point.radius[0] : 40.0;

        this.nTimesteps = Math.max(
            this.point.hasOwnProperty('alpha') ? this.point.alpha.length : 1,
            this.point.hasOwnProperty('color') ? this.point.color.length : 1,
            this.point.hasOwnProperty('radius') ? this.point.radius.length: 1
        );
        this.timestep = 0;
    }

    public get compartmentAcronym() {
        return this.point.compartment.acronym;
    }

    public get compartmentId() {
        return this.point.compartment.id;
    }

    public get compartmentName() {
        return this.point.compartment.name;
    }

    public get isVisible() {
        return this.visible;
    }

    public get pointId() {
        return this.point.id;
    }

    public get penetrationId() {
        return this.point.penetrationId;
    }

    public get x() {
        return this.point.x;
    }

    public get y() {
        return this.point.y;
    }

    public get z() {
        return this.point.z;
    }

    public get alpha() {
        return this._alpha;
    }

    public get color() {
        return this._color;
    }

    public get radius() {
        return this._radius;
    }

    public incrementTimestep() {
        this.timestep += (1 % this.nTimesteps);
    }

    public makeVisible() {
        this.visible = true;
    }

    public makeInvisible() {
        this.visible = false;
    }
}
