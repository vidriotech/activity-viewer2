import React from "react";
import * as _ from "lodash";

import CircularProgress from "@material-ui/core/CircularProgress";
import Container from "@material-ui/core/Container";
import Typography from "@material-ui/core/Typography";

import {createMuiTheme, ThemeProvider} from '@material-ui/core/styles';

// eslint-disable-next-line import/no-unresolved
import {APIClient} from "../apiClient";
// eslint-disable-next-line import/no-unresolved
import {AVConstants, defaultSettings} from "../constants";

// eslint-disable-next-line import/no-unresolved
import {AVSettings, ExportingUnit} from "../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {CompartmentTree} from "../models/compartmentTree";
// eslint-disable-next-line import/no-unresolved
import {Penetration, PenetrationInterface} from "../models/penetration";
// eslint-disable-next-line import/no-unresolved
import {Predicate} from "../models/predicates";

// eslint-disable-next-line import/no-unresolved
import { MainView, MainViewProps } from "./MainView";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Grid from "@material-ui/core/Grid";

const theme = createMuiTheme({
    palette: {
        primary: {
            main: "#1F77B4",
            contrastText: "#FFFFFF"
        },
        secondary: {
            main: "#FF7F0E",
            contrastText: "#FFFFFF"
        },
        error: {
            main: "#D62728",
        },
        warning: {
            main: "#BCBD22",
        },
        info: {
            main: "#17BECF",
        },
        success: {
            main: "#2CA02C",
        }
    }
});

export interface AppProps {
    settingsPath?: string;
    dataPaths?: string[];
}

interface AppState {
    compartmentTree: CompartmentTree;
    constants: AVConstants;
    settings: AVSettings;

    availablePenetrations: Set<string>;
    loadedPenetrations: Set<string>;
    selectedPenetrationIds: Set<string>;

    availableStats: Set<string>;
    availableTimeseries: Set<string>;

    filterPredicate: Predicate;

    nLoaded: number;
    nLoadable: number;
    ready: boolean;
}

export class App extends React.Component<AppProps, AppState> {
    private apiClient: APIClient;
    private penetrations: Map<string, Penetration>;

    constructor(props: AppProps) {
        super(props);

        this.state = {
            compartmentTree: null,
            constants: new AVConstants(),
            settings: null,

            availablePenetrations: new Set<string>(),
            loadedPenetrations: new Set<string>(),
            selectedPenetrationIds: new Set<string>(),

            availableStats: new Set<string>(),
            availableTimeseries: new Set<string>(),

            filterPredicate: null,

            ready: false,
            nLoaded: 0,
            nLoadable: 0
        };

        this.apiClient = new APIClient(this.state.constants.apiEndpoint);
        this.penetrations = new Map<string, Penetration>();
    }

    private async fetchPenetrationVitals(): Promise<void> {
        const availableStats = new Set<string>();
        const availableTimeseries = new Set<string>();
        const loadedPenetrations = new Set<string>();

        for (const pid of this.state.availablePenetrations) {
            let penetrationData: PenetrationInterface;

            await this.apiClient.fetchPenetrationVitals(pid)
                .then((data) => {
                    penetrationData = data;
                })
                .catch((err) => {
                    console.error(err)
                });

            if (penetrationData) {
                penetrationData.unitStatIds.forEach((statId) => {
                    availableStats.add(statId);
                });

                penetrationData.timeseriesIds.forEach((timeseriesId) => {
                    availableTimeseries.add(timeseriesId);
                });

                loadedPenetrations.add(pid);

                const penetration = Penetration.fromResponse(penetrationData);
                if (this.state.filterPredicate) {
                    penetration.setFilter(this.state.filterPredicate);
                }

                this.penetrations.set(pid, penetration);
            }

            this.setState({nLoaded: this.state.nLoaded + 1});
        }

        this.setState({loadedPenetrations, availableStats, availableTimeseries, ready: true});
    }

    private getSelectedPenetrations(): Map<string, Penetration> {
        const selectedPenetrations = new Map<string, Penetration>();

        this.state.selectedPenetrationIds.forEach((id) => {
            const pen = this.penetrations.get(id);
            selectedPenetrations.set(id, pen);
        });

        return selectedPenetrations;
    }

    private handleRequestUnitExport(): void {
        const unitExport: ExportingUnit[] = [];
        this.state.loadedPenetrations.forEach((penetrationId) => {
            const penetration = this.penetrations.get(penetrationId);

            if (penetration) {
                unitExport.push({
                    penetrationId: penetrationId,
                    unitIds: penetration.selectedUnits,
                });
            }
        });

        this.apiClient.fetchExportedData(unitExport)
            .then((data) => {
                const blob = new Blob([data]);
                const url = URL.createObjectURL(blob);

                const a = document.createElement("a");
                document.body.appendChild(a);
                a.href = url;
                a.download = "export.npz";
                a.click();

                window.URL.revokeObjectURL(url);
            }).catch((err) => {
                console.error(err)
            });
    }

    private handleRequestUnloadPenetration(penetrationId: string): void {
        if (this.penetrations.has(penetrationId)) {
            this.penetrations.delete(penetrationId);

            const loadedPenetrations = _.clone(this.state.loadedPenetrations);
            loadedPenetrations.delete(penetrationId);

            const selectedPenetrations = _.clone(this.state.selectedPenetrationIds);
            selectedPenetrations.delete(penetrationId);

            this.setState({loadedPenetrations, selectedPenetrationIds: selectedPenetrations});
        }
    }

    private handleSetDataFiles(): void {
        this.apiClient.setPenetrationPaths(this.props.dataPaths)
            .then((data) => {
                const availablePenetrations = new Set<string>(data.penetrationIds);
                this.setState({availablePenetrations}, () => {
                    this.fetchPenetrationVitals();
                });
            });
    }

    private handleSetSettingsFile(): void {
        let availablePenetrations: Set<string>;
        let settings: AVSettings = null;
        let compartmentTree: CompartmentTree = null;

        this.apiClient.setSettings(this.props.settingsPath)
            .then((data: AVSettings) => {
                settings = data;

                return this.apiClient.fetchCompartmentTree();
            })
            .then((rootNode) => {
                compartmentTree = CompartmentTree.fromCompartmentNode(rootNode);

                return this.apiClient.fetchPenetrationIds();
            })
            .then((data) => {
                availablePenetrations = new Set<string>(data.penetrationIds);
                this.setState({
                    availablePenetrations,
                    compartmentTree,
                    settings,
                    nLoaded: 0,
                    nLoadable: data.penetrationIds.length,
                }, () => {
                    this.fetchPenetrationVitals();
                });
            })
            .catch((err) => {
                console.error(err);
            });
    }

    private handleUpdateFilterPredicate(predicate: Predicate): void {
        this.penetrations.forEach((penetration) => {
            penetration.setFilter(predicate);
        });

        this.setState({
            filterPredicate: predicate
        });
    }

    private handleUpdateSelectedPenetrations(selectedPenetrationIds: string[]): void {
        this.state.compartmentTree.unregisterAllUnits();

        // register all units in their respective compartment nodes
        selectedPenetrationIds.forEach((penetrationId) => {
            const penetration = this.penetrations.get(penetrationId);
            penetration.compartments.forEach((compartment, idx) => {
                if (compartment && compartment.name) {
                    const node = this.state.compartmentTree.getCompartmentNodeByName(compartment.name);
                    if (node) {
                        node.registerUnit(penetration.id, penetration.unitIds[idx]);
                    }
                }
            });
        })

        this.setState({
            selectedPenetrationIds: new Set<string>(selectedPenetrationIds)
        });
    }

    public componentDidMount(): void {
        if (this.props.settingsPath !== "") {
            this.handleSetSettingsFile();
        } else {
            const availablePenetrations = new Set<string>();
            const settings = defaultSettings;

            this.apiClient.fetchCompartmentTree()
                .then((rootNode) => {
                    const compartmentTree = CompartmentTree.fromCompartmentNode(rootNode);
                    this.setState({availablePenetrations, compartmentTree, settings, ready: true});
                });
        }
    }

    public componentDidUpdate(prevProps: Readonly<AppProps>): void {
        if (this.props.settingsPath && prevProps.settingsPath !== this.props.settingsPath) {
            this.setState({ready: false}, () => {
                this.handleSetSettingsFile();
            });
        } else if (this.props.dataPaths && prevProps.dataPaths !== this.props.dataPaths) {
            this.setState({ready: false, nLoaded: 0, nLoadable: this.props.dataPaths.length}, () => {
                this.handleSetDataFiles();
            });
        }
    }

    public render(): React.ReactElement {
        const mainViewProps: MainViewProps = {
            compartmentTree: this.state.compartmentTree,
            constants: this.state.constants,
            settings: this.state.settings,

            availablePenetrations: this.state.availablePenetrations,
            loadedPenetrations: this.state.loadedPenetrations,
            selectedPenetrations: this.getSelectedPenetrations(),

            availableStats: this.state.availableStats,
            availableTimeseries: this.state.availableTimeseries,

            filterPredicate: this.state.filterPredicate,

            onRequestUnitExport: this.handleRequestUnitExport.bind(this),
            onRequestUnloadPenetration: this.handleRequestUnloadPenetration.bind(this),
            onUpdateSelectedPenetrations: this.handleUpdateSelectedPenetrations.bind(this),
            onUpdateFilterPredicate: this.handleUpdateFilterPredicate.bind(this),
        }

        return (
            <div>
                <Dialog open={(!(this.state.compartmentTree && this.state.settings && this.state.ready))}
                        disableBackdropClick
                        disableEscapeKeyDown
                        aria-labelledby="loading-modal" >
                    <DialogTitle>Loading penetrations</DialogTitle>
                    <DialogContent>
                        <Grid container alignItems="center">
                            <Grid item xs={2}>
                                <CircularProgress variant="indeterminate" size={25} />
                            </Grid>
                            <Grid item xs>

                                <Typography variant="body1" component="h1">
                                    {`Fetching penetration ${this.state.nLoaded}/${this.state.nLoadable}`}
                                </Typography>
                            </Grid>
                        </Grid>
                    </DialogContent>
                </Dialog>
                <MainView {...mainViewProps} />;
            </div>
        );
    }
}
