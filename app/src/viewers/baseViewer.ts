// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../constants";
// eslint-disable-next-line import/no-unresolved
import {Epoch} from "../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {PenetrationViewModel} from "../viewmodels/penetrationViewModel";

export abstract class BaseViewer {
    protected constants: AVConstants;
    protected epochs: Epoch[];
    protected penetrationViewModelsMap: Map<string, PenetrationViewModel>;

    // animation
    protected _timeVal = 0;

    public readonly canvasId = "viewer-canvas";
    public HEIGHT: number;
    public WIDTH: number;
    public container = 'container';

    protected constructor(constants: AVConstants, epochs: Epoch[]) {
        this.constants = constants;
        this.epochs = epochs.sort((e1, e2) => e1.bounds[0] - e2.bounds[0]);

        this.penetrationViewModelsMap = new Map<string, PenetrationViewModel>();
    }

    public abstract initialize(): void;

    public setAesthetics(penetrationId: string, viewModel: PenetrationViewModel): void {
        this.penetrationViewModelsMap.set(
            penetrationId, viewModel // new PenetrationViewModel(aes, nPoints)
        );
    }

    public abstract setSize(width: number, height: number): void;
}
