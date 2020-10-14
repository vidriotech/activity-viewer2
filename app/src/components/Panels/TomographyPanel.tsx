import React from "react";

// eslint-disable-next-line import/no-unresolved
import {CoronalMax, SagittalMax} from "../../constants";

// eslint-disable-next-line import/no-unresolved
import {SliceType} from "../../models/enums";

// eslint-disable-next-line import/no-unresolved
import {SliceSelector} from "../Tomography/SliceSelector";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";

export interface TomographyPanelProps {
    busy: boolean;

    showTomographySlice: boolean;
    showTomographyAnnotation: boolean;
    showTestSlice: boolean;
    testSliceBounds: [number, number];
    testSliceType: SliceType;

    onCommitSlicing(): void;
    onSelectSliceType(sliceType: SliceType, testSliceBounds: [number, number]): void;
    onUnselectSliceType(): void;
    onUpdateTestSliceBounds(testSliceBounds: [number, number]): void;
    onToggleTemplateDisplay(): void;
}

export interface TomographyPanelState {
    coronalIsChecked: boolean;
    coronalTemplateIsChecked: boolean;
    coronalBounds: [number, number];

    sagittalIsChecked: boolean;
    sagittalTemplateIsChecked: boolean;
    sagittalBounds: [number, number];
}

export class TomographyPanel extends React.Component<TomographyPanelProps, TomographyPanelState> {
    constructor(props: TomographyPanelProps) {
        super(props);

        const coronalBounds = this.props.testSliceType === SliceType.CORONAL ?
            this.props.testSliceBounds :
            [-500, 500].map((x) => x + CoronalMax / 2) as [number, number];

        const sagittalBounds = this.props.testSliceType === SliceType.SAGITTAL ?
            this.props.testSliceBounds :
            [-500, 500].map((x) => x + SagittalMax / 2) as [number, number];

        this.state = {
            coronalBounds: coronalBounds,
            coronalIsChecked: this.props.testSliceType === SliceType.CORONAL,
            coronalTemplateIsChecked: this.props.testSliceType === SliceType.CORONAL && !this.props.showTomographyAnnotation,

            sagittalBounds: sagittalBounds,
            sagittalIsChecked: this.props.testSliceType === SliceType.SAGITTAL,
            sagittalTemplateIsChecked: this.props.testSliceType === SliceType.SAGITTAL && !this.props.showTomographyAnnotation,
        }
    }

    private handleBoundsChange(sliceType: SliceType, values: [number, number]): void {
        this.setState({
            coronalBounds: sliceType === SliceType.CORONAL ? values : this.state.coronalBounds,
            sagittalBounds: sliceType === SliceType.SAGITTAL ? values : this.state.sagittalBounds,
        }, () => {
            this.props.onUpdateTestSliceBounds(values);
        });
    }

    private handleToggleSliceDisplay(sliceType: SliceType): void {
        let coronalIsChecked: boolean;
        let sagittalIsChecked: boolean;
        let bounds: [number, number];

        const unselect = (sliceType === SliceType.CORONAL && this.state.sagittalIsChecked) ||
            (sliceType === SliceType.SAGITTAL && this.state.coronalIsChecked);

        switch (sliceType) {
            case SliceType.CORONAL:
                bounds = this.state.coronalBounds;
                coronalIsChecked = !this.state.coronalIsChecked;
                sagittalIsChecked = false;
                break;
            case SliceType.SAGITTAL:
                bounds = this.state.sagittalBounds;
                coronalIsChecked = false;
                sagittalIsChecked = !this.state.sagittalIsChecked;
                break;
        }

        this.setState({coronalIsChecked, sagittalIsChecked}, () => {
            if (!(coronalIsChecked || sagittalIsChecked) || unselect) {
                this.props.onUnselectSliceType();
            } else {
                this.props.onSelectSliceType(sliceType, bounds);
            }
        });
    }

    private handleToggleTemplateDisplay(sliceType: SliceType): void {
        this.setState({
            coronalTemplateIsChecked: sliceType === SliceType.CORONAL ?
                !this.state.coronalTemplateIsChecked :
                this.state.coronalTemplateIsChecked,
            sagittalTemplateIsChecked: sliceType === SliceType.SAGITTAL ?
                !this.state.sagittalTemplateIsChecked :
                this.state.sagittalTemplateIsChecked
        }, () => {
            this.props.onToggleTemplateDisplay();
        });
    }

    private isCommitDisabled(): boolean {
        let isDisabled = false;

        if (!this.props.showTestSlice && !this.state.coronalIsChecked && !this.state.sagittalIsChecked) {
            isDisabled = false;
        }

        return isDisabled;

        // this.state = {
        //     coronalBounds: coronalBounds,
        //     coronalIsChecked: this.props.testSliceType === SliceType.CORONAL,
        //     coronalTemplateIsChecked: this.props.testSliceType === SliceType.CORONAL && !this.props.showTomographyAnnotation,
        //
        //     sagittalBounds: sagittalBounds,
        //     sagittalIsChecked: this.props.testSliceType === SliceType.SAGITTAL,
        //     sagittalTemplateIsChecked: this.props.testSliceType === SliceType.SAGITTAL && !this.props.showTomographyAnnotation,
        // }
    }

    public render(): React.ReactElement {
        return (
            <Grid container
                  style={{padding: "40px"}} >
                <Grid item xs={12}>
                    <SliceSelector busy={this.props.busy}
                                   disableSlider={this.props.showTomographySlice}
                                   sliceType={SliceType.CORONAL}
                                   checked={this.state.coronalIsChecked}
                                   templateChecked={this.state.coronalTemplateIsChecked}
                                   sliderLimits={[0, CoronalMax]}
                                   sliderValues={this.state.coronalBounds}
                                   onToggle={(): void => {
                                       this.handleToggleSliceDisplay(SliceType.CORONAL);
                                   }}
                                   onToggleTemplate={(): void => {
                                       this.handleToggleTemplateDisplay(SliceType.CORONAL)
                                   }}
                                   onUpdateSlider={(values: [number, number]): void => {
                                       this.handleBoundsChange(SliceType.CORONAL, values);
                                   }} />
                </Grid>
                <Grid item xs={12}>
                    <SliceSelector busy={this.props.busy}
                                   disableSlider={this.props.showTomographySlice}
                                   sliceType={SliceType.SAGITTAL}
                                   checked={this.state.sagittalIsChecked}
                                   templateChecked={this.state.sagittalTemplateIsChecked}
                                   sliderLimits={[0, SagittalMax]}
                                   sliderValues={this.state.sagittalBounds}
                                   onToggle={(): void => {
                                       this.handleToggleSliceDisplay(SliceType.SAGITTAL)
                                   }}
                                   onToggleTemplate={(): void => {
                                       this.handleToggleTemplateDisplay(SliceType.SAGITTAL)
                                   }}
                                   onUpdateSlider={(values: [number, number]): void => {
                                       this.handleBoundsChange(SliceType.SAGITTAL, values);
                                   }} />
                </Grid>
                <Grid item>
                    <Button variant="contained"
                            color="primary"
                            disabled={this.props.busy || this.isCommitDisabled()}
                            onClick={this.props.onCommitSlicing} >
                        Commit
                    </Button>
                </Grid>
            </Grid>
        );
    }
}