import React from "react";
import Grid from "@material-ui/core/Grid";

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../../constants";

// eslint-disable-next-line import/no-unresolved
import {AVSettings} from "../../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {Predicate, PropIneqPredicate} from "../../models/predicateModels";

// eslint-disable-next-line import/no-unresolved
import {CompartmentNodeView} from "../../viewmodels/compartmentViewModel";

// eslint-disable-next-line import/no-unresolved
// eslint-disable-next-line import/no-unresolved
// eslint-disable-next-line import/no-unresolved
import {ViewerContainer, ViewerContainerProps} from "../Viewers/ViewerContainer";
// eslint-disable-next-line import/no-unresolved
// eslint-disable-next-line import/no-unresolved
import {PhysiologyPanel, PhysiologyPanelProps} from "./PhysiologyPanel";
// eslint-disable-next-line import/no-unresolved
import {DataPanel, DataPanelProps} from "./DataPanel";
// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";
// eslint-disable-next-line import/no-unresolved
import {SliceType} from "../../models/enums";

export interface DisplayPanelProps {
    selectedPenetrations: Map<string, Penetration>;
    compartmentViewTree: CompartmentNodeView;
    constants: AVConstants;
    settings: AVSettings;

    colorTimeseries: string;
    colorBounds: [number, number];
    colorGamma: number;
    colorMapping: string;

    opacityTimeseries: string;
    opacityBounds: [number, number];
    opacityGamma: number;

    radiusTimeseries: string;
    radiusBounds: [number, number];
    radiusGamma: number;

    busy: boolean;
    progress: number;
    progressMessage: string;

    onToggleCompartmentVisible(rootNode: CompartmentNodeView): void;
    onRequestUnitExport(): void;
    onUpdateFilterPredicate(predicate: Predicate, newStat?: string): void;
    onUpdateProgress(progress: number, progressMessage: string): void;
}

interface DisplayPanelState {
    showDataPanel: boolean;
    showPhysPanel: boolean;

    showTomographyAnnotation: boolean;
    showTomographySlice: boolean;
    tomographySliceType: SliceType;
    tomographySliceCoordinate: number;

    showTestSlice: boolean;
    testSliceBounds: [number, number];
    testSliceType: SliceType;
}

export class DisplayPanel extends React.Component<DisplayPanelProps, DisplayPanelState> {
    constructor(props: DisplayPanelProps) {
        super(props);

        this.state = {
            showDataPanel: true,
            showPhysPanel: true,

            showTomographyAnnotation: true,
            showTomographySlice: false,
            tomographySliceType: null,
            tomographySliceCoordinate: NaN,

            showTestSlice: false,
            testSliceBounds: [NaN, NaN],
            testSliceType: null,
        };
    }

    private handleCommitSlicing(): void {
        const sliceCoordinate = (this.state.testSliceBounds[0] + this.state.testSliceBounds[1]) / 2

        this.setState({
            showTestSlice: false,
            showTomographySlice: true,
            tomographySliceType: this.state.testSliceType,
            tomographySliceCoordinate: sliceCoordinate,
        }, () => {
            const coordName = this.state.tomographySliceType === SliceType.CORONAL ?
                "x" : "z";
            const predicate = new PropIneqPredicate(coordName, ...this.state.testSliceBounds);
            this.props.onUpdateFilterPredicate(predicate);
        });
    }

    public render(): React.ReactElement {
        const dataPanelProps: DataPanelProps = {
            selectedPenetrations: this.props.selectedPenetrations,
            constants: this.props.constants,
            settings: this.props.settings,

            busy: this.props.busy,

            onCollapse: () => {this.setState({showDataPanel: false})},
            onRequestUnitExport: this.props.onRequestUnitExport,
        }

        const viewerContainerProps: ViewerContainerProps = {
            compartmentViewTree: this.props.compartmentViewTree,
            constants: this.props.constants,
            settings: this.props.settings,

            colorTimeseries: this.props.colorTimeseries,
            colorBounds: this.props.colorBounds,
            colorGamma: this.props.colorGamma,
            colorMapping: this.props.colorMapping,

            opacityTimeseries: this.props.opacityTimeseries,
            opacityBounds: this.props.opacityBounds,
            opacityGamma: this.props.opacityGamma,

            radiusTimeseries: this.props.radiusTimeseries,
            radiusBounds: this.props.radiusBounds,
            radiusGamma: this.props.radiusGamma,

            selectedPenetrations: this.props.selectedPenetrations,
            busy: this.props.busy,
            progress: this.props.progress,
            progressMessage: this.props.progressMessage,

            showDataPanel: this.state.showDataPanel,
            showPhysPanel: this.state.showPhysPanel,

            showTomographyAnnotation: this.state.showTomographyAnnotation,
            showTomographySlice: this.state.showTomographySlice,
            tomographySliceType: this.state.tomographySliceType,
            tomographySliceCoordinate: this.state.tomographySliceCoordinate,

            showTestSlice: this.state.showTestSlice,
            testSliceType: this.state.testSliceType,
            testSliceBounds: this.state.testSliceBounds,

            onExpand: (side: "l" | "r"): void => {
                if (side === "l") {
                    this.setState({showDataPanel: true});
                } else if (side === "r") {
                    this.setState({showPhysPanel: true});
                }
            },
            onUpdateFilterPredicate: this.props.onUpdateFilterPredicate,
            onUpdateProgress: this.props.onUpdateProgress,
        };

        const physiologyPanelProps: PhysiologyPanelProps = {
            selectedPenetrations: this.props.selectedPenetrations,
            compartmentViewTree: this.props.compartmentViewTree,
            constants: this.props.constants,
            settings: this.props.settings,

            busy: this.props.busy,

            showTomographyAnnotation: this.state.showTomographyAnnotation,
            showTestSlice: this.state.showTestSlice,
            testSliceBounds: this.state.testSliceBounds,
            testSliceType: this.state.testSliceType,

            onCollapse: () => {this.setState({showPhysPanel: false})},
            onToggleCompartmentVisible: this.props.onToggleCompartmentVisible,

            onCommitSlicing: this.handleCommitSlicing.bind(this),
            onSelectSliceType: (testSliceType: SliceType, testSliceBounds: [number, number]) => {
                this.setState({
                    showTestSlice: true,
                    testSliceType,
                    testSliceBounds,
                });
            },
            onUnselectSliceType: () => {
                this.setState({showTestSlice: false, showTomographySlice: false});
            },
            onUpdateTestSliceBounds: (testSliceBounds: [number, number]): void => {
                this.setState({
                    showTestSlice: true,
                    testSliceBounds
                });
            },
            onToggleTemplateDisplay: () => {
                this.setState({
                    showTomographyAnnotation: !this.state.showTomographyAnnotation
                });
            }
        };

        const xs = 12 - 3 * (Number(this.state.showDataPanel) + Number(this.state.showPhysPanel));

        return (
            <Grid container
                  spacing={0}
                  style={{
                      borderTop: "1px solid black",
                      borderBottom: "1px solid black",
                      borderRight: this.state.showPhysPanel ? "1px solid black" : "none",
                      borderLeft: this.state.showDataPanel ? "1px solid black" : "none",
                      margin: 0
                  }}>
                {this.state.showDataPanel ?
                    <Grid item xs={3}>
                        <DataPanel {...dataPanelProps} />
                    </Grid> :
                    null
                }
                <Grid item xs={xs as 6 | 9 | 12}>
                    <ViewerContainer {...viewerContainerProps} />
                </Grid>
                {this.state.showPhysPanel ?
                    <Grid item xs={3}>
                        <PhysiologyPanel {...physiologyPanelProps} />
                    </Grid> :
                    null
                }
            </Grid>
        );
    }
}
