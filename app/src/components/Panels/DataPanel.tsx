import React from "react";

import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";

import {ChevronLeft} from "@material-ui/icons";
import SaveIcon from "@material-ui/icons/Save";

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../../constants";
// eslint-disable-next-line import/no-unresolved
import {tab10Blue} from "../../styles";

// eslint-disable-next-line import/no-unresolved
import {AVSettings, PenetrationData} from "../../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../../models/penetration";

// eslint-disable-next-line import/no-unresolved
import {UnitTable} from "../UnitTable/UnitTable";

export interface DataPanelProps {
    selectedPenetrations: Map<string, Penetration>;
    constants: AVConstants;
    settings: AVSettings;

    busy: boolean;

    onCollapse(): void;
    onRequestUnitExport(): void;
}

interface DataPanelState {
    busy: true;
}

export class DataPanel extends React.Component<DataPanelProps, DataPanelState> {
    constructor(props: DataPanelProps) {
        super(props);


    }

    private renderHeader(): React.ReactElement {
        return (
            <Grid container item
                  justify="flex-start"
                  style={{
                      backgroundColor: tab10Blue,
                      "borderBottom": "1px solid black",
                      color: "white",
                      height: "50px",
                      width: "100%",
                      margin: 0,
                      padding: "10px"
                  }}>
                <Grid item xs={1}>
                    <IconButton color="inherit"
                                size="small"
                                disabled={this.props.busy || this.props.selectedPenetrations.size === 0}
                                onClick={this.props.onRequestUnitExport} >
                        <SaveIcon />
                    </IconButton>
                </Grid>
                <Grid item xs>
                    <Typography align="center"
                                variant="body1"
                                component="h4"
                                gutterBottom>
                        Data
                    </Typography>
                </Grid>
                <Grid item xs={1}>
                    <IconButton aria-label="showOrHideUnitTable"
                                color="inherit"
                                size="small"
                                onClick={this.props.onCollapse}>
                        <ChevronLeft />
                    </IconButton>
                </Grid>
            </Grid>
        );
    }

    public render(): React.ReactElement {
        const header = this.renderHeader();

        return (
            <Grid container
                  item>
                <Grid item xs={12}>{header}</Grid>
                <Grid item xs={12}>
                    <UnitTable selectedPenetrations={this.props.selectedPenetrations} />
                </Grid>
            </Grid>
        );
    }
}
