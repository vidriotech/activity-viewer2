import React from 'react';
import * as _ from "lodash";

import Grid from '@material-ui/core/Grid';

// eslint-disable-next-line import/no-unresolved
import {APIClient} from '../apiClient';
// eslint-disable-next-line import/no-unresolved
import {AVConstants} from '../constants';

// eslint-disable-next-line import/no-unresolved
import {AVSettings, ExportingUnit, PenetrationData, UnitStatsListResponse} from "../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {UnitModel} from '../models/unitModel';
// eslint-disable-next-line import/no-unresolved
import {Predicate} from '../models/predicates';


// eslint-disable-next-line import/no-unresolved
import {CompartmentList, CompartmentListProps} from './CompartmentList/CompartmentList';
// eslint-disable-next-line import/no-unresolved
import {TimeseriesMappers, TimeseriesMappersProps} from './TimeseriesControls/TimeseriesMappers';
// eslint-disable-next-line import/no-unresolved
import {ViewerContainer, ViewerContainerProps} from './ViewerContainer/ViewerContainer';
// eslint-disable-next-line import/no-unresolved
import {UnitTable, UnitTableProps} from './UnitTable/UnitTable';
// eslint-disable-next-line import/no-unresolved
// eslint-disable-next-line import/no-unresolved
import {TimeseriesData, TimeseriesSummary} from "../models/timeseries";

// eslint-disable-next-line import/no-unresolved
import MapperWorker from "worker-loader!../worker";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import {ChevronLeft, ChevronRight} from "@material-ui/icons";
import Container from "@material-ui/core/Container";
// eslint-disable-next-line import/no-unresolved
import {DisplayPanel, DisplayPanelProps} from "./Panels/DisplayPanel";
// eslint-disable-next-line import/no-unresolved
import {HeaderPanel} from "./Panels/HeaderPanel";
// eslint-disable-next-line import/no-unresolved
import {QueryPanel, QueryPanelProps} from "./Panels/QueryPanel";
// eslint-disable-next-line import/no-unresolved
import {Penetration} from "../models/penetration";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Checkbox from "@material-ui/core/Checkbox";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
// eslint-disable-next-line import/no-unresolved
import {SelectPenetrationsDialog} from "./SelectPenetrationsDialog";
// eslint-disable-next-line import/no-unresolved
import {CompartmentTree} from "../models/compartmentTree";

interface UnitStatsData {
    penetrationId: string;
    values: number[];
}

export interface MainViewProps {
    compartmentTree: CompartmentTree;
    constants: AVConstants;
    settings: AVSettings;

    availablePenetrations: Set<string>;
    loadedPenetrations: Set<string>;
    selectedPenetrations: Map<string, Penetration>;

    availableStats: Set<string>;
    availableTimeseries: Set<string>;

    filterPredicate: Predicate;

    onRequestUnitExport(): void;
    onRequestUnloadPenetration(penetrationId: string): void;
    onUpdateFilterPredicate(predicate: Predicate): void;
    onUpdateSelectedPenetrations(selectedPenetrationIds: string[]): void;
}

interface MainViewState {
    availablePenetrations: PenetrationData[];
    filterPredicate: Predicate;

    componentIsBusy: boolean;

    compartmentListHidden: boolean;
    unitTableHidden: boolean;

    showDisplayLeft: boolean;
    showDisplayRight: boolean;

    dialogOpen: boolean;
    selectPenetrationsDialog: boolean;
    selectedPenetrationIds: string[];
}

export class MainView extends React.Component<MainViewProps, MainViewState> {
    private apiClient: APIClient;
    private statsData: Map<string, UnitStatsData[]>;
    private timeseriesData: Map<string, TimeseriesData[]>;
    private timeseriesSummaries: Map<string, TimeseriesSummary>;
    private busyMessages: Map<string, string>; // ComponentName => busy message

    constructor(props: MainViewProps) {
        super(props);
 
        this.state = {
            availablePenetrations: [],

            filterPredicate: null,

            componentIsBusy: false,

            compartmentListHidden: false,
            unitTableHidden: false,

            showDisplayLeft: true,
            showDisplayRight: true,

            dialogOpen: true,
            selectPenetrationsDialog: true,
            selectedPenetrationIds: Array.from(this.props.selectedPenetrations.keys()),
        }

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.statsData = new Map<string, UnitStatsData[]>();
        this.timeseriesData = new Map<string, TimeseriesData[]>();
        this.timeseriesSummaries = new Map<string, TimeseriesSummary>();
        this.busyMessages = new Map<string, string>();
    }

    public componentDidUpdate(prevProps: Readonly<MainViewProps>): void {
        if (prevProps.loadedPenetrations !== this.props.loadedPenetrations) {
            this.setState({dialogOpen: true});
        }
    }

    public render(): React.ReactNode {
        const queryPanelProps: QueryPanelProps = {
            compartmentTree: this.props.compartmentTree,

            selectedPenetrations: this.props.selectedPenetrations,
            availableStats: this.props.availableStats,
            filterPredicate: this.props.filterPredicate,

            onUpdateFilterPredicate: this.props.onUpdateFilterPredicate,
        };

        const displayPanelProps: DisplayPanelProps = {
            compartmentTree: this.props.compartmentTree,
            constants: this.props.constants,
            settings: this.props.settings,

            availableTimeseries: this.props.availableTimeseries,
            selectedPenetrations: this.props.selectedPenetrations,

            onRequestUnitExport: this.props.onRequestUnitExport,
            onUpdateFilterPredicate: this.props.onUpdateFilterPredicate,
        };

        return (
            <Grid container
                  direction="column"
                  style={{padding: 20}}>
                <Grid item>
                    <HeaderPanel busy />
                </Grid>
                <Grid item>
                    <QueryPanel {...queryPanelProps} />
                </Grid>
                <Grid item>
                    <DisplayPanel {...displayPanelProps} />
                </Grid>
                <Grid item>
                    <SelectPenetrationsDialog open={this.state.dialogOpen}
                                              loadedPenetrationIds={Array.from(this.props.loadedPenetrations)}
                                              selectedPenetrations={this.props.selectedPenetrations}
                                              onCommitSelection={(selectedPenetrationIds): void => {
                                                  this.setState({dialogOpen: false}, () => {
                                                      if (selectedPenetrationIds) {
                                                          this.props.onUpdateSelectedPenetrations(selectedPenetrationIds);
                                                      }
                                                  });
                                              }} />
                </Grid>
            </Grid>
        );
    }
}