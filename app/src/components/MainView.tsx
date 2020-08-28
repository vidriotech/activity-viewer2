import React from 'react';
import * as _ from 'underscore';

import Grid from '@material-ui/core/Grid';

import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';
import { ISettingsResponse, IPenetrationData, ITimeseriesListResponse, IUnitStatsListResponse } from '../models/apiModels';
import { CompartmentTree } from '../models/compartmentTree';
import { Predicate, IFilterCondition } from '../models/filter';
import { PointModel, IPointSummary } from '../models/pointModel';
import { IAesthetics } from '../viewmodels/aestheticMapping';
import { ICompartmentView } from '../viewmodels/compartmentViewModel';

import { CompartmentNode } from './ControlPanel/CompartmentNode';
import { Viewer3D, IViewer3DProps } from './Viewers/Viewer3D';
import { ControlPanel, IControlPanelProps } from './ControlPanel/ControlPanel';


interface ITimeseriesData {
    penetrationId: string,
    times: number[],
    values: number[],
}

interface IUnitStatsData {
    penetrationId: string,
    values: number[],
}

export interface IMainViewProps {
    availablePenetrations: IPenetrationData[],
    compartmentTree: CompartmentTree,
    visibleCompartments: ICompartmentView[],
    constants: AVConstants,
    settings: ISettingsResponse,
    onUpdateSelectedCompartments(added: string[], removed: string[]): void,
    updateCompartments(compartments: ICompartmentView[]): void,
}

interface IMainViewState {
    aesthetics: IAesthetics[],
    colorBounds: number[],
    filterConditions: IFilterCondition[],
    opacityBounds: number[],
    radiusBounds: number[],
    rootNode: CompartmentNode,
    selectedColor: string,
    selectedOpacity: string,
    selectedRadius: string,
    selectedStat: string,
    subsetOnly: boolean,
    visiblePenetrations: string[],
}

export class MainView extends React.Component<IMainViewProps, IMainViewState> {
    private apiClient: APIClient;
    private statsData: Map<string, IUnitStatsData[]>;
    private timeseriesData: Map<string, ITimeseriesData[]>;

    constructor(props: IMainViewProps) {
        super(props);

        const rootNode = this.props.compartmentTree.getCompartmentSubsetTree(this.props.settings);
        this.state = {
            aesthetics: [],
            colorBounds: [0, 255],
            filterConditions: [],
            opacityBounds: [0.01, 1],
            radiusBounds: [5, 500],
            rootNode: new CompartmentNode(rootNode, true),
            selectedColor: 'nothing',
            selectedOpacity: 'nothing',
            selectedRadius: 'nothing',
            selectedStat: 'nothing',
            subsetOnly: true,
            visiblePenetrations: this.props.availablePenetrations.map(
                penetrationData => penetrationData.penetrationId
            ),
        }

        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
        this.statsData = new Map<string, IUnitStatsData[]>();
        this.timeseriesData = new Map<string, ITimeseriesData[]>();
    }

    private fetchAndUpdateTimeseries(value: string) {
        if (value !== 'nothing' && !this.timeseriesData.has(value)) {
            this.apiClient.fetchTimeseriesById(value)
                .then((res: any) => res.data)
                .then((responseData: ITimeseriesListResponse) => {
                    let seriesData: ITimeseriesData[] = [];

                    responseData.timeseries.forEach((data) => {
                        if (data.stride === 0) {
                            return;
                        }

                        seriesData.push({
                            penetrationId: data.penetrationId,
                            times: data.data.slice(0, data.stride),
                            values: data.data.slice(data.stride),
                        });
                    });

                    this.timeseriesData.set(value, seriesData);
                    this.updateAesthetics();
                })
                .catch((err: Error) => console.error(err));
        } else {
            this.updateAesthetics();
        }
    }

    private fetchAndUpdateUnitStats(value: string) {
        if (value !== 'nothing' && !this.statsData.has(value)) {
            this.apiClient.fetchUnitStatsById(value)
                .then((res: any) => res.data)
                .then((responseData: IUnitStatsListResponse) => {
                    let statsData: IUnitStatsData[] = [];

                    responseData.unitStats.forEach((data) => {
                        statsData.push({
                            penetrationId: data.penetrationId,
                            values: data.data
                        });
                    });

                    this.statsData.set(value, statsData);
                    this.setState({ selectedStat: value });
                })
                .catch((err: Error) => console.error(err));
        } else {
            this.setState({ selectedStat: value });
        }
    }

    private handleToggleSubsetOnly() {
        const subsetOnly = !this.state.subsetOnly;
        let rootNode;
        if (subsetOnly) {
            rootNode = new CompartmentNode(this.props.compartmentTree.getCompartmentSubsetTree(this.props.settings), true);
        } else {
            rootNode = new CompartmentNode(this.props.compartmentTree.getCompartmentNodeByName('root'), true);;
        }

        this.setState({subsetOnly: subsetOnly, rootNode: rootNode});
    }

    private handleNewFilterCondition(condition: IFilterCondition) {
        let conditions = this.state.filterConditions.slice();
        conditions.push(condition); // TODO: concatenate in an intelligent way
        this.setState({ filterConditions: [condition] }, () => {
            this.updateAesthetics();
        });
    }

    private handleOpacitySelectionChange(event: React.ChangeEvent<{
        name?: string;
        value: any;
    }>) {
        const value = event.target.value as string;
        let newState = { selectedOpacity: value };

        if (value !== 'nothing' && this.state.selectedRadius === value) {
            newState = _.extend(newState, { selectedRadius: 'nothing' });
        }

        if (value !== 'nothing' && this.state.selectedColor === value) {
            newState = _.extend(newState, { selectedColor: 'nothing' });
        }

        this.setState(newState, () => this.fetchAndUpdateTimeseries(value));
    }

    private handleOpacitySliderChange(event: any, newValue: number[], commit: boolean) {
        this.setState({ opacityBounds: newValue }, () => {
            if (commit) {
                this.updateAesthetics();
            }
        });
    }

    private handleRadiusSelectionChange(event: React.ChangeEvent<{
        name?: string;
        value: any;
    }>) {
        const value = event.target.value as string;
        let newState = { selectedRadius: value };

        if (value !== 'nothing' && this.state.selectedOpacity === value) {
            newState = _.extend(newState, { selectedOpacity: 'nothing' });
        }

        if (value !== 'nothing' && this.state.selectedColor === value) {
            newState = _.extend(newState, { selectedColor: 'nothing' });
        }

        this.setState(newState, () => this.fetchAndUpdateTimeseries(value));
    }

    private handleRadiusSliderChange(event: any, newValue: number[], commit: boolean) {
        this.setState({ radiusBounds: newValue }, () => {
            if (commit) {
                this.updateAesthetics();
            }
        });
    }

    private handleStatSelectionChange(event: React.ChangeEvent<{
        name?: string;
        value: string;
    }>) {
        const value = event.target.value;
        this.fetchAndUpdateUnitStats(value);
    }

    private transformValues(data: number[], transformBounds: number[]): number[] {
        let dataMin = data[0];
        let dataMax = data[0];
        data.forEach(x => {
            dataMin = Math.min(x, dataMin);
            dataMax = Math.max(x, dataMax);
        });
        const dataRange = dataMax - dataMin;

        const transformMin = transformBounds[0];
        const transformMax = transformBounds[1];
        const transformRange = transformMax - transformMin;

        let xValues;
        if (dataMin === dataMax) {
            xValues = data.map(_x => (transformMax - transformMin) / 2);
        } else {
            xValues = data.map(x =>
                transformMin + transformRange*(x - dataMin)/dataRange
            );
        }

        return xValues;
    }

    private updateAesthetics() {
        let visiblePenetrations = this.props.availablePenetrations.map(
            value => value.penetrationId
        );

        if (this.state.selectedColor !== 'nothing') {
            visiblePenetrations = _.intersection(
                visiblePenetrations,
                this.timeseriesData.get(this.state.selectedColor).map(
                    seriesData => seriesData.penetrationId
                )
            );
        }

        if (this.state.selectedOpacity !== 'nothing') {
            visiblePenetrations = _.intersection(
                visiblePenetrations,
                this.timeseriesData.get(this.state.selectedOpacity).map(
                    seriesData => seriesData.penetrationId
                )
            );
        }

        if (this.state.selectedRadius !== 'nothing') {
            visiblePenetrations = _.intersection(
                visiblePenetrations,
                this.timeseriesData.get(this.state.selectedRadius).map(
                    seriesData => seriesData.penetrationId
                )
            );
        }

        let aesthetics: IAesthetics[] = [];

        const colorData = this.state.selectedColor === 'nothing' ? null : this.timeseriesData.get(this.state.selectedColor);
        const opacityData = this.state.selectedOpacity === 'nothing' ? null : this.timeseriesData.get(this.state.selectedOpacity);
        const radiusData = this.state.selectedRadius === 'nothing' ? null : this.timeseriesData.get(this.state.selectedRadius);

        visiblePenetrations.forEach((penetrationId) => {
            const penIdx = this.props.availablePenetrations.map(p => p.penetrationId).indexOf(penetrationId);
            const penetrationData = this.props.availablePenetrations[penIdx];

            const penColor = colorData === null ? null : colorData.filter((data) => data.penetrationId === penetrationId)[0];
            const penOpacity = opacityData === null ? null : opacityData.filter((data) => data.penetrationId === penetrationId)[0];
            const penRadius = radiusData === null ? null : radiusData.filter((data) => data.penetrationId === penetrationId)[0];

            // collection stats data for points in this penetration
            const penStatsData = new Map<string, IUnitStatsData>();
            this.statsData.forEach((statValues, statName) => {
                const idx = statValues.map(v => v.penetrationId).indexOf(penetrationId);
                if (idx === -1) {
                    return;
                }

                penStatsData.set(statName, statValues[idx]);
            });

            // filter points
            let pointModels: PointModel[] = [];
            for (let i = 0; i < penetrationData.ids.length; i++) {
                const summary: IPointSummary = {
                    compartment: penetrationData.compartments[i],
                    coordinates: penetrationData.coordinates.slice(i*3, 3),
                    id: penetrationData.ids[i],
                    penetrationId: penetrationId,
                };
                let pointModel = new PointModel(summary);

                penStatsData.forEach((statValues, statName) => {
                    pointModel.setStat(statName, statValues.values[i]);
                });
                pointModels.push(pointModel);
            }

            let penVisibility = new Array(penetrationData.ids.length);
            penVisibility.fill(true);

            // logical AND on all filter conditions
            this.state.filterConditions.forEach((condition) => {
                const predicate = new Predicate(condition);
                const satisfied = predicate.eval(pointModels);
                penVisibility = penVisibility.map((p, i) => p && satisfied[i]);
            });

            const aesthetic: IAesthetics = {
                penetrationId: penetrationId,
                color: penColor === null ? null : {
                    timeseriesId: this.state.selectedColor,
                    times: penColor.times,
                    values: this.transformValues(penColor.values, this.state.colorBounds)
                },
                opacity: penOpacity === null ? null : {
                    timeseriesId: this.state.selectedOpacity,
                    times: penOpacity.times,
                    values: this.transformValues(penOpacity.values, this.state.opacityBounds)
                },
                radius: penRadius === null ? null : {
                    timeseriesId: this.state.selectedRadius,
                    times: penRadius.times,
                    values: this.transformValues(penRadius.values, this.state.radiusBounds)
                },
                visible: penVisibility
            };
            aesthetics.push(aesthetic);
        });

        this.setState({ visiblePenetrations, aesthetics });
    }

    public componentDidUpdate(prevProps: IMainViewProps) {
        if (!_.isEqual(prevProps.availablePenetrations, this.props.availablePenetrations)) {
            this.setState({
                visiblePenetrations: this.props.availablePenetrations.map(
                    penetrationData => penetrationData.penetrationId
                )
            });
        }
    }

    public render() {
        const viewer3DProps: IViewer3DProps = {
            aestheticMappings: this.state.aesthetics,
            availablePenetrations: this.props.availablePenetrations,
            constants: this.props.constants,
            compartmentTree: this.props.compartmentTree,
            settings: this.props.settings,
            visibleCompartments: this.props.visibleCompartments,
            updateCompartments: this.props.updateCompartments,
        };

        const controlPanelProps: IControlPanelProps = {
            availablePenetrations: this.props.availablePenetrations,
            constants: this.props.constants,
            opacityBounds: this.state.opacityBounds,
            radiusBounds: this.state.radiusBounds,
            selectedOpacity: this.state.selectedOpacity,
            selectedRadius: this.state.selectedRadius,
            selectedStat: this.state.selectedStat,
            statsData: this.state.selectedStat !== 'nothing' ?
                _.union(
                    ...(this.statsData.get(this.state.selectedStat).map(entry => entry.values))
                ) : [],
            onNewFilterCondition: this.handleNewFilterCondition.bind(this),
            onOpacitySelectionChange: this.handleOpacitySelectionChange.bind(this),
            onOpacitySliderChange: this.handleOpacitySliderChange.bind(this),
            onRadiusSelectionChange: this.handleRadiusSelectionChange.bind(this),
            onRadiusSliderChange: this.handleRadiusSliderChange.bind(this),
            onStatSelectionChange: this.handleStatSelectionChange.bind(this),
        }

        const style = {width: "100%", height: "100%"};
        return (
            <div style={style}>
                <Grid container spacing={3}>
                    <Grid item xs={7}>
                        <Viewer3D {...viewer3DProps} />
                    </Grid>
                    <Grid item xs={5}>
                        <ControlPanel {...controlPanelProps} />
                    </Grid>
                </Grid>
            </div>
        );
    }
}