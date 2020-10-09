import React from "react";
import * as _ from "lodash";

import CircularProgress from "@material-ui/core/CircularProgress";
import Container from "@material-ui/core/Container";
import Typography from "@material-ui/core/Typography";

import {createMuiTheme, ThemeProvider} from '@material-ui/core/styles';

// eslint-disable-next-line import/no-unresolved
import {APIClient} from "../apiClient";
// eslint-disable-next-line import/no-unresolved
import { AVConstants } from "../constants";

// eslint-disable-next-line import/no-unresolved
import {AVSettings, ExportingUnit, PenetrationData} from "../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {Penetration, PenetrationInterface} from "../models/penetration";
// eslint-disable-next-line import/no-unresolved
import {Predicate} from "../models/predicates";
// eslint-disable-next-line import/no-unresolved
import {UnitModel} from "../models/unitModel";

// eslint-disable-next-line import/no-unresolved
import { MainView, MainViewProps } from "./MainView";
import {CompartmentTree} from "../models/compartmentTree";

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
    initialSettingsPath: string;
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
        };

        this.apiClient = new APIClient(this.state.constants.apiEndpoint);
        this.penetrations = new Map<string, Penetration>();
    }

    private async fetchPenetrationVitals(): Promise<void> {
        for (const pid of this.state.availablePenetrations) {
            let penetrationData: PenetrationInterface;

            await this.apiClient.fetchPenetrationVitals(pid)
                .then((res) => {
                    penetrationData = res.data;
                })
                .catch((err) => {
                    console.error(err)
                });

            if (penetrationData) {
                this.penetrations.set(
                    pid,
                    Penetration.fromResponse(penetrationData)
                );

                const availableStats = _.clone(this.state.availableStats);
                penetrationData.unitStatIds.forEach((statId) => {
                    availableStats.add(statId);
                });

                const availableTimeseries = _.clone(this.state.availableTimeseries);
                penetrationData.timeseriesIds.forEach((timeseriesId) => {
                    availableTimeseries.add(timeseriesId);
                });

                const loadedPenetrations = _.clone(this.state.loadedPenetrations);
                loadedPenetrations.add(pid);

                this.setState({loadedPenetrations, availableStats, availableTimeseries});
            }
        }
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
            .then((data) => data.data)
            .then((data) => {
                const blob = new Blob([data]);
                const url = URL.createObjectURL(blob);

                const a = document.createElement("a");
                document.body.appendChild(a);
                a.href = url;
                a.download = "export.npz";
                a.click();

                window.URL.revokeObjectURL(url);
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
        let availablePenetrations: Set<string>;
        let settings: AVSettings = null;
        let compartmentTree: CompartmentTree = null;

        this.apiClient.setSettings(this.props.initialSettingsPath)
            .then((data: AVSettings) => {
                settings = data;

                return this.apiClient.fetchCompartmentTree();
            })
            .then((rootNode) => {
                compartmentTree = CompartmentTree.fromCompartmentNode(rootNode);

                return this.apiClient.fetchPenetrationIds();
            })
            .then((res) => res.data)
            .then((data) => {
                availablePenetrations = new Set<string>(data.penetrationIds);
                this.setState({availablePenetrations, compartmentTree, settings}, () => {
                    this.fetchPenetrationVitals()
                        .then(() => this.setState({ready: true}));
                });
            })
            .catch((err) => {
                console.error(err);
            });
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

        const nAvailable = this.state.availablePenetrations.size;
        const nLoaded = this.state.loadedPenetrations.size;
        const message = nAvailable > 0 ?
            `Fetching penetration ${nLoaded + 1} / ${nAvailable} ...` :
            "Loading ...";
        if (!(this.state.compartmentTree && this.state.settings && this.state.ready)) {
            return (
                <Container>
                    <CircularProgress variant="indeterminate" />
                    <Typography variant="h6" component="h1">
                        {message}
                    </Typography>
                </Container>
            )
        } else {
            return <MainView {...mainViewProps} />;
        }
    }
}
