import * as _ from 'underscore';

import { PointModel } from './pointModel';


export interface IFilterCondition {
    booleanOp: 'AND' | 'OR',
    key: string,
    valType: 'stat' | 'property',
    equals: string,
    greaterThan: number,
    lessThan: number,
    negate: boolean,
}

export class Predicate {
    private condition: IFilterCondition;

    constructor(condition: IFilterCondition) {
        this.condition = condition;
    }

    public eval(arr: PointModel[]): boolean[] {
        const prop = this.condition.key as keyof(PointModel);

        return arr.map(p => {
            let result: boolean;
            if (this.condition.valType === 'property') {
                result = p[prop] === this.condition.equals;
            } else {
                const val = p.getStat(prop);
                result = val > this.condition.greaterThan && 
                    val < this.condition.lessThan;
            }

            return this.condition.negate ? !result : result;
        });
    }
}

