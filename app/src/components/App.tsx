import React from "react";
import * as _ from "lodash";

import CircularProgress from '@material-ui/core/CircularProgress';

import {createMuiTheme, ThemeProvider} from '@material-ui/core/styles';

// eslint-disable-next-line import/no-unresolved
import { AVConstants } from "../constants";
// eslint-disable-next-line import/no-unresolved
import { CompartmentTree } from "../compartmentTree";

// eslint-disable-next-line import/no-unresolved
import {AVSettings, ExportingUnit, PenetrationData} from "../models/apiModels";
// eslint-disable-next-line import/no-unresolved
import {Penetration, PenetrationInterface} from "../models/penetration";

// eslint-disable-next-line import/no-unresolved
import {APIClient} from "../apiClient";

// eslint-disable-next-line import/no-unresolved
import { MainView, MainViewProps } from "./MainView";
import Container from "@material-ui/core/Container";
import Typography from "@material-ui/core/Typography";

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

interface AppState {
    compartmentTree: CompartmentTree;
    constants: AVConstants;
    settings: AVSettings;

    availablePenetrations: Set<string>;
    loadedPenetrations: Set<string>;
    selectedPenetrations: Set<string>;

    ready: boolean;
}

export class App extends React.Component<{}, AppState> {
    private apiClient: APIClient;
    private penetrations: Map<string, Penetration>;

    constructor(props: {}) {
        super(props);

        this.state = {
            compartmentTree: null,
            constants: new AVConstants(),
            settings: null,

            availablePenetrations: new Set<string>(),
            loadedPenetrations: new Set<string>(),
            selectedPenetrations: new Set<string>(),

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

                const loadedPenetrations = _.clone(this.state.loadedPenetrations);
                loadedPenetrations.add(pid);
                this.setState({loadedPenetrations});
            }
        }
        // this.apiClient.fetchPenetrations(10, page)
        //     .then((res) => res.data)
        //     .then((data) => {
        //         const availablePenetrations = _.clone(this.state.availablePenetrations);
        //         const newPenetrations: PenetrationData[] = new Array(data.penetrations.length);
        //
        //         data.penetrations.forEach((penetrationData, idx) => {
        //             newPenetrations[idx] = _.extend(
        //                 penetrationData,
        //                 {"selected": penetrationData.ids.map(() => true)}
        //             );
        //         });
        //
        //         const nPenetrations = availablePenetrations.length + newPenetrations.length;
        //         const progressMessage = nPenetrations < data.info.totalCount ?
        //             `Fetched ${nPenetrations}/${data.info.totalCount} penetrations.` :
        //             "Ready.";
        //
        //         this.setState({
        //             availablePenetrations: _.concat(availablePenetrations, newPenetrations),
        //             progress: nPenetrations / data.info.totalCount,
        //             progressMessage: progressMessage,
        //         }, () => {
        //             if (data.link) {
        //                 this.fetchAndUpdatePenetrations(page + 1);
        //             }
        //         });
        //     })
        //     .catch((err: Error) => {
        //         console.error(err);
        //         window.alert(err.message);
        //     });
    }

    private getSelectedPenetrations(): Map<string, Penetration> {
        const selectedPenetrations = new Map<string, Penetration>();

        this.state.selectedPenetrations.forEach((id) => {
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

            const selectedPenetrations = _.clone(this.state.selectedPenetrations);
            selectedPenetrations.delete(penetrationId);

            this.setState({loadedPenetrations, selectedPenetrations});
        }
    }

    public componentDidMount(): void {
        let availablePenetrations: Set<string>;
        let settings: AVSettings = null;
        let compartmentTree: CompartmentTree = null;

        this.apiClient.fetchSettings()
            .then((res) => res.data)
            .then((data: AVSettings) => {
                settings = data;

                return this.apiClient.fetchCompartmentTree();
            })
            .then((res) => res.data)
            .then((root) => {
                compartmentTree = new CompartmentTree(root, settings);

                return this.apiClient.fetchPenetrationIds();
            })
            .then((res) => res.data)
            .then((data) => {
                availablePenetrations = new Set<string>(data.penetrationIds);
                this.setState({availablePenetrations, compartmentTree, settings});

                this.fetchPenetrationVitals()
                    .then(() => this.setState({ready: true}));
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

            onRequestUnitExport: this.handleRequestUnitExport.bind(this),
            onRequestUnloadPenetration: this.handleRequestUnloadPenetration.bind(this),
            onUpdateSelectedPenetrations: (selectedPenetrations: string[]) => {
                this.setState({
                    selectedPenetrations: new Set<string>(selectedPenetrations)
                });
            }
        }

        const nAvailable = this.state.availablePenetrations.size;
        const nLoaded = this.state.loadedPenetrations.size;
        const message = nAvailable > 0 ?
            `Loading penetration ${nLoaded} / ${nAvailable} ...` :
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
