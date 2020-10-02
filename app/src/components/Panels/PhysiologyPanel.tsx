import React from "react";

import Grid from "@material-ui/core/Grid";

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../../constants";
// eslint-disable-next-line import/no-unresolved
import {headerStyle, tab10Blue} from "../../styles";

// eslint-disable-next-line import/no-unresolved
import {AVSettings, PenetrationData} from "../../models/apiModels";

// eslint-disable-next-line import/no-unresolved
import {CompartmentNodeView} from "../../viewmodels/compartmentViewModel";

// eslint-disable-next-line import/no-unresolved
import {CompartmentList, CompartmentListProps} from "../CompartmentList/CompartmentList";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import {ChevronRight} from "@material-ui/icons";

export interface PhysiologyPanelProps {
    availablePenetrations: PenetrationData[];
    compartmentViewTree: CompartmentNodeView;
    constants: AVConstants;
    settings: AVSettings;

    busy: boolean;

    onCollapse(): void;
    onToggleCompartmentVisible(rootNode: CompartmentNodeView): void;
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
                      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                      // @ts-ignore
                      "border-bottom": "1px solid black",
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
            availablePenetrations: this.props.availablePenetrations,
            busy: this.props.busy,
            compartmentViewTree: this.props.compartmentViewTree,
            constants: this.props.constants,
            settings: this.props.settings,

            onToggleCompartmentVisible: this.props.onToggleCompartmentVisible,
        };

        const header = this.renderHeader();

        return (
            <Grid container
                  item>
                <Grid item xs={12}>{header}</Grid>
                <Grid item xs={12}>
                    <CompartmentList {...compartmentListProps} />
                </Grid>
            </Grid>
        );
    }
}
