import React from "react";
import * as _ from "lodash";

import Grid from "@material-ui/core/Grid";

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../../constants";

// eslint-disable-next-line import/no-unresolved
import {AVSettings} from "../../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {Predicate, PropIneqPredicate} from "../../models/predicateModels";

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
import {CompartmentTree} from "../../models/compartmentTree";

export interface DisplayPanelProps {
    compartmentTree: CompartmentTree;
    constants: AVConstants;
    settings: AVSettings;

    availableTimeseries: Set<string>;
    selectedPenetrations: Map<string, Penetration>;

    busy: boolean;
    progress: number;
    progressMessage: string;

    onRequestUnitExport(): void;
    onUpdateFilterPredicate(predicate: Predicate, newStat?: string): void;
    onUpdateProgress(progress: number, progressMessage: string): void;
}

interface DisplayPanelState {
    showDataPanel: boolean;
    showPhysPanel: boolean;

    visibleCompartmentIds: Set<number>;

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

            visibleCompartmentIds: new Set<number>([this.props.compartmentTree.getCompartmentNodeByName("root").id]),

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

    private handleToggleCompartmentVisible(compartmentId: number): void {
        const visibleCompartmentIds = _.clone(this.state.visibleCompartmentIds);
        if (visibleCompartmentIds.has(compartmentId)) {
            visibleCompartmentIds.delete(compartmentId);
        } else {
            visibleCompartmentIds.add(compartmentId);
        }

        this.setState({visibleCompartmentIds});
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
            compartmentTree: this.props.compartmentTree,
            constants: this.props.constants,
            settings: this.props.settings,

            availableTimeseries: this.props.availableTimeseries,
            selectedPenetrations: this.props.selectedPenetrations,
            visibleCompartmentIds: this.state.visibleCompartmentIds,

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
            compartmentTree: this.props.compartmentTree,
            constants: this.props.constants,
            settings: this.props.settings,

            busy: this.props.busy,

            selectedPenetrations: this.props.selectedPenetrations,
            visibleCompartmentIds: this.state.visibleCompartmentIds,

            showTomographyAnnotation: this.state.showTomographyAnnotation,
            showTestSlice: this.state.showTestSlice,
            testSliceBounds: this.state.testSliceBounds,
            testSliceType: this.state.testSliceType,

            onCollapse: () => {this.setState({showPhysPanel: false})},
            onToggleCompartmentVisible: this.handleToggleCompartmentVisible.bind(this),

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
