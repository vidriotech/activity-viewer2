import React from "react";

import Grid from "@material-ui/core/Grid";

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../../constants";
// eslint-disable-next-line import/no-unresolved
import {headerStyle, tab10Blue} from "../../styles";

// eslint-disable-next-line import/no-unresolved
import {AVSettings, PenetrationData} from "../../models/apiModels";

// eslint-disable-next-line import/no-unresolved
import {CompartmentList, CompartmentListProps} from "../CompartmentList/CompartmentList";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import {ChevronRight} from "@material-ui/icons";
// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";
// eslint-disable-next-line import/no-unresolved
import {TomographyPanel, TomographyPanelProps} from "./TomographyPanel";
// eslint-disable-next-line import/no-unresolved
import {SliceImageType, SliceType} from "../../models/enums";
import {CompartmentTree} from "../../models/compartmentTree";

export interface PhysiologyPanelProps {
    compartmentTree: CompartmentTree;
    constants: AVConstants;
    settings: AVSettings;

    selectedPenetrations: Map<string, Penetration>;
    visibleCompartmentIds: Set<number>;
    busy: boolean;
    isSlicing: boolean;
    isLocked: boolean;
    tomographySliceShown: boolean;

    tomographyAnnotationShown: boolean;
    showTestSlice: boolean;
    testSliceBounds: [number, number];

    sliceCoordinate: number;

    sliceType: SliceType;
    sliceImageType: SliceImageType;

    onCollapse(): void;
    onToggleCompartmentVisible(compartmentId: number): void;

    onBeginSlicing(): void;
    onCancelSlicing(): void;
    onCommitSlicing(): void;
    onClearSlicing(): void;
    onSetSliceType(sliceType: SliceType): void;
    onSetSliceImageType(sliceImageType: SliceImageType): void;
    onSetSliceCoordinate(coordinate: number): void;

    onSelectSliceType(sliceType: SliceType, testSliceBounds: [number, number], showTemplate: boolean): void;
    onUnselectSliceType(): void;
    onUpdateTestSliceBounds(bounds: [number, number]): void;
    onToggleTemplateDisplay(): void;
}

interface PhysiologyPanelState {
    busy: true;
}

export class PhysiologyPanel extends React.Component<PhysiologyPanelProps, PhysiologyPanelState> {
    constructor(props: PhysiologyPanelProps) {
        super(props);
    }

    private renderHeader(): React.ReactElement {
        return (
            <Grid container item
                  justify="flex-start"
                  style={{
                      backgroundColor: tab10Blue,
                      borderBottom: "1px solid black",
                      color: "white",
                      height: "50px",
                      width: "100%",
                      margin: 0,
                      padding: "10px",
                  }}>
                <Grid item xs={1}>
                    <IconButton aria-label="showOrHideUnitTable"
                                color="inherit"
                                size="small"
                                onClick={this.props.onCollapse}>
                        <ChevronRight />
                    </IconButton>
                </Grid>
                <Grid item xs>
                    <Typography align="center"
                                variant="body1"
                                component="h4"
                                gutterBottom>
                        Physiology
                    </Typography>
                </Grid>
            </Grid>
        );
    }

    public render(): React.ReactElement {
        const compartmentListProps: CompartmentListProps = {
            busy: this.props.busy,
            compartmentTree: this.props.compartmentTree,
            settings: this.props.settings,

            visibleCompartmentIds: this.props.visibleCompartmentIds,

            onToggleCompartmentVisible: this.props.onToggleCompartmentVisible,
        };

        const tomographyPanelProps: TomographyPanelProps = {
            busy: this.props.busy,
            isSlicing: this.props.isSlicing,
            isLocked: this.props.isLocked,
            tomographySliceShown: this.props.tomographySliceShown,

            showTestSlice: this.props.showTestSlice,
            testSliceBounds: this.props.testSliceBounds,

            sliceCoordinate: this.props.sliceCoordinate,

            sliceType: this.props.sliceType,
            sliceImageType: this.props.sliceImageType,

            onBeginSlicing: this.props.onBeginSlicing,
            onCancelSlicing: this.props.onCancelSlicing,
            onCommitSlicing: this.props.onCommitSlicing,
            onClearSlicing: this.props.onClearSlicing,
            onSetSliceType: this.props.onSetSliceType,
            onSetSliceImageType: this.props.onSetSliceImageType,
            onSetSliceCoordinate: this.props.onSetSliceCoordinate,

            onSelectSliceType: this.props.onSelectSliceType,
            onUnselectSliceType: this.props.onUnselectSliceType,
            onUpdateTestSliceBounds: this.props.onUpdateTestSliceBounds,
            onToggleTemplateDisplay: this.props.onToggleTemplateDisplay,
        }

        const header = this.renderHeader();

        return (
            <Grid container
                  item>
                <Grid item xs={12}>{header}</Grid>
                <Grid item xs={12}>
                    <CompartmentList {...compartmentListProps} />
                </Grid>
                <Grid item xs={12}>
                    <TomographyPanel {...tomographyPanelProps} />
                </Grid>
            </Grid>
        );
    }
}
