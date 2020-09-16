import * as _ from 'lodash';

import { CompartmentNode } from './apiModels';
import { PointModel } from './pointModel';


export type PredicateType = 'string' | 'stat' | 'mixed';

export abstract class Predicate {
    private type: PredicateType;

    constructor(type: PredicateType) {
        this.type = type;
    }

    abstract eval(points: PointModel[]): boolean[];
    abstract toString(): string;
    
    public depth(): number {
        return 0;
    }

    public and(other: Predicate): Predicate {
        return new ANDPredicateChain(this, other);
    }

    public or(other: Predicate): Predicate {
        return new ORPredicateChain(this, other);
    }

    public get predicateType(): PredicateType {
        return this.type;
    }
}

// StatPredicates are BOUNDED, i.e., they have a lower bound and an upper bound
// stats are accessed via the `getStat` method of a PointModel
export class StatPredicate extends Predicate {
    protected _statName: string;
    protected _lowerBound: number;
    protected _upperBound: number;

    constructor(statName: string, lowerBound: number, upperBound: number) {
        super('stat');

        this._statName = statName;
        this._lowerBound = lowerBound;
        this._upperBound = upperBound;
    }

    public and(other: Predicate | StatPredicate): Predicate {
        if (_.has(other, '_statName') && ((other as StatPredicate).statName === this.statName)) {
            return new StatPredicate(
                this.statName,
                Math.max(this.lowerBound, (other as StatPredicate).lowerBound),
                Math.min(this.upperBound, (other as StatPredicate).upperBound),
            );
        } else {
            return new ANDPredicateChain(this, other);
        }
    }

    public or(other: Predicate | StatPredicate): Predicate {
        if (_.has(other, '_statName') && ((other as StatPredicate).statName === this.statName)) {
            return new StatPredicate(
                this.statName,
                Math.min(this.lowerBound, (other as StatPredicate).lowerBound),
                Math.max(this.upperBound, (other as StatPredicate).upperBound),
            );
        } else {
            return new ORPredicateChain(this, other);
        }
    }

    public eval(points: PointModel[]): boolean[] {
        let result: boolean[] = new Array(points.length);
        points.forEach((point: PointModel, idx: number) => {
            const stat = point.getStat(this._statName);
            result[idx] = (this._lowerBound <= stat) && (stat <= this._upperBound);
        });

        return result;
    }

    public toString(): string {
        return `${this._lowerBound} ≤ ${this._statName} ≤ ${this._upperBound}`;
    }

    public get statName() {
        return this._statName;
    }

    public get lowerBound() {
        return this._lowerBound;
    }

    public get upperBound() {
        return this._upperBound;
    }
}

// StringPropPredicate are (IN)EQUALITIES
export class PropEqPredicate extends Predicate {
    private propName: keyof(PointModel);
    private propValue: string | number;
    private negate: boolean;

    constructor(propName: keyof(PointModel), propValue: string | number, negate: boolean) {
        super('string');

        this.propName = propName;
        this.propValue = propValue;
        this.negate = negate;
    }

    public eval(points: PointModel[]): boolean[] {
        const result: boolean[] = new Array(points.length);
        points.forEach((point: PointModel, idx: number) => {
            const val = point[this.propName];
            result[idx] = (val === this.propValue);
            if (this.negate) {
                result[idx] = !result[idx];
            }
        });

        return result;
    }

    public toString(): string {
        const operator = this.negate ? '≠' : '=';
        return `${this.propName} ${operator} '${this.propValue}'`;
    }
}

export class PropIneqPredicate extends Predicate {
    private readonly _propName: keyof(PointModel);
    protected _lowerBound: number;
    protected _upperBound: number;
    
    constructor(propName: keyof(PointModel), lowerBound: number, upperBound: number) {
        super('string');

        this._propName = propName;
        this._lowerBound = lowerBound;
        this._upperBound = upperBound;
    }

    public and(other: Predicate | PropIneqPredicate): Predicate {
        if (_.has(other, '_propName') && _.has(other, "_lowerBound") && ((other as PropIneqPredicate).propName === this.propName)) {
            return new PropIneqPredicate(
                this.propName,
                Math.max(this.lowerBound, (other as PropIneqPredicate).lowerBound),
                Math.min(this.upperBound, (other as PropIneqPredicate).upperBound),
            );
        } else {
            return new ANDPredicateChain(this, other);
        }
    }

    public or(other: Predicate | PropIneqPredicate): Predicate {
        if (_.has(other, '_propName') && _.has(other, "_lowerBound") && ((other as PropIneqPredicate).propName === this.propName)) {
            return new PropIneqPredicate(
                this.propName,
                Math.min(this.lowerBound, (other as PropIneqPredicate).lowerBound),
                Math.max(this.upperBound, (other as PropIneqPredicate).upperBound),
            );
        } else {
            return new ORPredicateChain(this, other);
        }
    }

    public eval(points: PointModel[]): boolean[] {
        const result: boolean[] = new Array(points.length);
        points.forEach((point: PointModel, idx: number) => {
            const val = point[this.propName];
            result[idx] = (this._lowerBound <= val) && (val <= this._upperBound);
        });

        return result;
    }

    public toString(): string {
        return `${this.lowerBound} ≤ ${this.propName} ≤ ${this.upperBound}`;
    }

    public get propName(): keyof(PointModel) {
        return this._propName;
    }

    public get lowerBound(): number {
        return this._lowerBound;
    }

    public get upperBound(): number {
        return this._upperBound;
    }
}

export class SubcompartmentPredicate extends Predicate {
    private parentCompartment: CompartmentNode;

    constructor(parentCompartment: CompartmentNode, ) {
        super('string');

        this.parentCompartment = parentCompartment;
    }

    public eval(points: PointModel[]): boolean[] {
        let result: boolean[] = new Array(points.length);
        points.forEach((point: PointModel, idx: number) => {
            result[idx] = point.compartmentIdPath === null ?
                false : point.compartmentIdPath.includes(this.parentCompartment.id);
        });

        return result;
    }

    public toString(): string {
        return `compartmentName ⊆ ${this.parentCompartment.name}`;
    }
}

export abstract class PredicateChain extends Predicate {
    protected predicates: Predicate[];

    constructor(...predicates: Predicate[]) {
        let types = predicates.map((p) => p.predicateType);
        let type = _.uniq(types).length === 1 ?
            types[0] : 'mixed';

        super(type);
        this.predicates = predicates;
    }

    public depth(): number {
        return _.max(this.predicates.map((p) => p.depth())) + 1;
    }

    abstract eval(points: PointModel[]): boolean[];

    public split(): Predicate[] {
        return this.predicates.sort((a, b) => a.depth() - b.depth());
    }

    abstract without(idx: number): Predicate;
}

export class ANDPredicateChain extends PredicateChain {
    public eval(points: PointModel[]): boolean[] {
        let result: boolean[] = new Array(points.length);
        result.fill(true);

        result.forEach((val, idx) => {
            this.predicates.forEach((p) => {
                if (val === false) { // short-circuit, 1 && 0 && ... && 1 == 0
                    return;
                }

                let response = p.eval([points[idx]]);
                val = val && response[0];
            });

            result[idx] = val;
        });

        return result;
    }

    public and(other: Predicate): ANDPredicateChain { // flatten the chain
        let predicates: Predicate[];

        if (other instanceof ANDPredicateChain) {
            predicates = _.concat(this.predicates, other.predicates);
        } else {
            predicates = _.concat(this.predicates, [other]);
        }

        return new ANDPredicateChain(...predicates);
    }

    public toString() {
        return '(' + _.join(this.predicates, ') && (') + ')';
    }
    
    public without(idx: number) {
        if (idx < 0 || idx >= this.predicates.length) {
            return this;
        } else {
            let predicates = _.concat(
                this.predicates.slice(0, idx),
                this.predicates.slice(idx+1)
            );
            
            if (predicates.length === 1) {
                return predicates[0];
            } else {
                return new ANDPredicateChain(...predicates);
            }
        }
    }
}

export class ORPredicateChain extends PredicateChain {
    public eval(points: PointModel[]): boolean[] {
        let result: boolean[] = new Array(points.length);
        result.fill(false);

        result.forEach((val, idx) => {
            this.predicates.forEach((p) => {
                if (val === true) { // short-circuit, 0 || 1 || ... || 0 == 1
                    return;
                }

                let response = p.eval([points[idx]]);
                val = val || response[0];
            });

            result[idx] = val;
        });

        return result;
    }

    public or(other: Predicate): ORPredicateChain { // flatten the chain
        let predicates: Predicate[];

        if (other instanceof ORPredicateChain) {
            predicates = _.concat(this.predicates, other.predicates);
        } else {
            predicates = _.concat(this.predicates, [other]);
        }

        return new ORPredicateChain(...predicates);
    }

    public toString() {
        return '(' + _.join(this.predicates, ') || (') + ')';
    }
    
    public without(idx: number) {
        if (idx < 0 || idx >= this.predicates.length) {
            return this;
        } else {
            let predicates = _.concat(
                this.predicates.slice(0, idx),
                this.predicates.slice(idx+1)
            );

            if (predicates.length === 1) {
                return predicates[0];
            } else {
                return new ORPredicateChain(...predicates);
            }
        }
    }
}
