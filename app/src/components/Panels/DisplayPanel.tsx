import React from "react";
import * as _ from "lodash";

import Grid from "@material-ui/core/Grid";

// eslint-disable-next-line import/no-unresolved
import {AVConstants, CoronalMax, SagittalMax} from "../../constants";

// eslint-disable-next-line import/no-unresolved
import {AVSettings} from "../../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {Predicate, PropIneqPredicate} from "../../models/predicates";

// eslint-disable-next-line import/no-unresolved
import {ViewerContainer, ViewerContainerProps} from "../ViewerContainer/ViewerContainer";
// eslint-disable-next-line import/no-unresolved
// eslint-disable-next-line import/no-unresolved
import {PhysiologyPanel, PhysiologyPanelProps} from "./PhysiologyPanel";
// eslint-disable-next-line import/no-unresolved
import {DataPanel, DataPanelProps} from "./DataPanel";
// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";
// eslint-disable-next-line import/no-unresolved
import {SliceImageType, SliceType} from "../../models/enums";
// eslint-disable-next-line import/no-unresolved
import {CompartmentTree} from "../../models/compartmentTree";

export interface DisplayPanelProps {
    compartmentTree: CompartmentTree;
    constants: AVConstants;
    settings: AVSettings;

    availableTimeseries: Set<string>;
    selectedPenetrations: Map<string, Penetration>;

    onRequestUnitExport(): void;
    onUpdateFilterPredicate(predicate: Predicate, newStat?: string): void;
}

interface DisplayPanelState {
    showDataPanel: boolean;
    showPhysPanel: boolean;

    progress: number;
    progressMessage: string;

    visibleCompartmentIds: Set<number>;

    showTomographyAnnotation: boolean;
    showTomographySlice: boolean;
    tomographySliceType: SliceType;
    tomographySliceCoordinate: number;
    rotateLocked: boolean;

    showTestSlice: boolean;
    testSliceBounds: [number, number];
    sliceType: SliceType;
    sliceImageType: SliceImageType;
}

export class DisplayPanel extends React.Component<DisplayPanelProps, DisplayPanelState> {
    constructor(props: DisplayPanelProps) {
        super(props);

        const visibleCompartmentIds: number[] = [];
        if (this.props.compartmentTree) {
            visibleCompartmentIds.push(this.props.compartmentTree.getCompartmentNodeByName("root").id);
        }

        this.state = {
            showDataPanel: true,
            showPhysPanel: true,

            progress: 1,
            progressMessage: "Ready.",

            visibleCompartmentIds: new Set<number>(visibleCompartmentIds),

            showTomographyAnnotation: true,
            showTomographySlice: false,
            tomographySliceType: null,
            tomographySliceCoordinate: SliceType.CORONAL / 2,
            rotateLocked: false,

            showTestSlice: false,
            testSliceBounds: [NaN, NaN],
            sliceType: SliceType.CORONAL,
            sliceImageType: SliceImageType.ANNOTATION,
        };
    }

    private handleBeginSlicing(): void {
        let testSliceBounds: [number, number];

        switch (this.state.sliceType) {
            case SliceType.CORONAL:
                testSliceBounds = [CoronalMax / 2 - 500, CoronalMax / 2 + 500];
                break;
            case SliceType.SAGITTAL:
                testSliceBounds = [SagittalMax / 2 - 500, SagittalMax / 2 + 500];
                break;
        }

        this.setState({
            testSliceBounds,
            showTestSlice: true
        });
    }

    private handleCommitSlicing(): void {
        const sliceCoordinate = (this.state.testSliceBounds[0] + this.state.testSliceBounds[1]) / 2

        this.setState({
            showTestSlice: false,
            showTomographySlice: true,
            tomographySliceType: this.state.sliceType,
            tomographySliceCoordinate: sliceCoordinate,
            rotateLocked: true,
        }, () => {
            const coordName = this.state.tomographySliceType === SliceType.CORONAL ?
                "x" : "z";
            const predicate = new PropIneqPredicate(coordName, ...this.state.testSliceBounds);
            this.props.onUpdateFilterPredicate(predicate);
        });
    }

    private handleSetSliceCoordinate(coordinate: number, commit: boolean): void {
        this.setState({
            tomographySliceCoordinate: coordinate
        }, () => {
            let coordName: "x" | "z";
            let maxCoord: number;

            switch (this.state.tomographySliceType) {
                case SliceType.CORONAL:
                    coordName = "x";
                    maxCoord = CoronalMax;
                    break;
                case SliceType.SAGITTAL:
                    coordName = "z";
                    maxCoord = SagittalMax;
            }

            if (commit) {
                const padding = (this.state.testSliceBounds[1] - this.state.testSliceBounds[0]) / 2;
                const predicate = new PropIneqPredicate(
                    coordName,
                    Math.max(0, coordinate - padding),
                    Math.min(maxCoord, coordinate + padding)
                );

                this.props.onUpdateFilterPredicate(predicate);
            }
        });
    }

    private handleSetRotateLocked(rotateLocked: boolean): void {
        this.setState({rotateLocked}, () => {
            if (this.state.rotateLocked && this.state.showTomographySlice) {
                let coordName: "x" | "z";
                let maxCoord: number;

                switch (this.state.tomographySliceType) {
                    case SliceType.CORONAL:
                        coordName = "x";
                        maxCoord = CoronalMax;
                        break;
                    case SliceType.SAGITTAL:
                        coordName = "z";
                        maxCoord = SagittalMax;
                }

                const padding = (this.state.testSliceBounds[1] - this.state.testSliceBounds[0]) / 2;
                const predicate = new PropIneqPredicate(
                    coordName,
                    Math.max(0, this.state.tomographySliceCoordinate - padding),
                    Math.min(maxCoord, this.state.tomographySliceCoordinate + padding)
                );

                this.props.onUpdateFilterPredicate(predicate);
            }
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

    private isBusy(): boolean {
        return this.state.progress < 1;
    }

    public componentDidUpdate(prevProps: Readonly<DisplayPanelProps>): void {
        if (!prevProps.compartmentTree && this.props.compartmentTree) {
            const visibleCompartmentIds = _.clone(this.state.visibleCompartmentIds);
            visibleCompartmentIds.add(this.props.compartmentTree.getCompartmentNodeByName("root").id);
            this.setState({visibleCompartmentIds});
        }
    }

    public render(): React.ReactElement {
        const dataPanelProps: DataPanelProps = {
            selectedPenetrations: this.props.selectedPenetrations,
            constants: this.props.constants,
            settings: this.props.settings,

            busy: this.isBusy(),

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

            busy: this.isBusy(),
            progress: this.state.progress,
            progressMessage: this.state.progressMessage,

            showDataPanel: this.state.showDataPanel,
            showPhysPanel: this.state.showPhysPanel,

            showTomographySlice: this.state.showTomographySlice,
            tomographySliceType: this.state.tomographySliceType,
            tomographySliceCoordinate: this.state.tomographySliceCoordinate,
            rotateLocked: this.state.rotateLocked,

            showTestSlice: this.state.showTestSlice,
            testSliceBounds: this.state.testSliceBounds,

            sliceType: this.state.sliceType,
            sliceImageType: this.state.sliceImageType,

            onExpand: (side: "l" | "r"): void => {
                if (side === "l") {
                    this.setState({showDataPanel: true});
                } else if (side === "r") {
                    this.setState({showPhysPanel: true});
                }
            },
            onSetRotateLocked: this.handleSetRotateLocked.bind(this),
            onUpdateFilterPredicate: this.props.onUpdateFilterPredicate,
            onUpdateProgress: (progress: number, progressMessage: string): void => {
                this.setState({progress, progressMessage})
            }
        };

        const physiologyPanelProps: PhysiologyPanelProps = {
            compartmentTree: this.props.compartmentTree,
            constants: this.props.constants,
            settings: this.props.settings,

            busy: this.isBusy(),
            isSlicing: this.state.showTestSlice,
            isLocked: this.state.rotateLocked,

            selectedPenetrations: this.props.selectedPenetrations,
            visibleCompartmentIds: this.state.visibleCompartmentIds,
            tomographySliceShown: this.state.showTomographySlice,
            tomographyAnnotationShown: this.state.showTomographyAnnotation,

            showTestSlice: this.state.showTestSlice,
            testSliceBounds: this.state.testSliceBounds,

            sliceCoordinate: this.state.tomographySliceCoordinate,

            sliceType: this.state.sliceType,
            sliceImageType: this.state.sliceImageType,

            onCollapse: () => {this.setState({showPhysPanel: false})},
            onToggleCompartmentVisible: this.handleToggleCompartmentVisible.bind(this),

            onBeginSlicing: this.handleBeginSlicing.bind(this),
            onCancelSlicing: () => {this.setState({showTestSlice: false})},
            onCommitSlicing: this.handleCommitSlicing.bind(this),
            onClearSlicing: () => {this.setState({showTomographySlice: false})},
            onSetSliceType: (sliceType: SliceType) => {
                this.setState({sliceType})
            },
            onSetSliceImageType: (sliceImageType: SliceImageType) => {
                this.setState({sliceImageType})
            },
            onSetSliceCoordinate: this.handleSetSliceCoordinate.bind(this),

            onSelectSliceType: (testSliceType: SliceType, testSliceBounds: [number, number], showTemplate: boolean) => {
                this.setState({
                    showTestSlice: true,
                    sliceType: testSliceType,
                    testSliceBounds,
                    showTomographyAnnotation: !showTemplate
                });
            },
            onUnselectSliceType: () => {
                this.setState({showTestSlice: false, showTomographySlice: false})
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
