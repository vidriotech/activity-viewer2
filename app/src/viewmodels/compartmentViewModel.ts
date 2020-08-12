import { ICompartment } from '../models/apiModels';

export interface ICompartmentView extends ICompartment {
    isVisible: boolean;
}
