import React from 'react';
import * as _ from "lodash";

import Button from "@material-ui/core/Button";
import Grid from '@material-ui/core/Grid';

// eslint-disable-next-line import/no-unresolved
import {AestheticProps, AestheticSelection, AestheticType} from "../../models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {ColorMapper, ColorMapperProps} from './ColorMapper';
// eslint-disable-next-line import/no-unresolved
import {ScalarMapper, ScalarMapperProps} from './ScalarMapper';
// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../../constants";

export interface TimeseriesMappersProps extends AestheticProps {
    busy: boolean;
    constants: AVConstants;
    timeseriesList: string[];
    onCommit(props: AestheticProps): void;
}

interface TimeseriesMappersState {
    colorTimeseries: string;
    colorBounds: [number, number];
    colorGamma: number;
    colorMapping: string;

    opacityTimeseries: string;
    opacityBounds: [number, number];
    opacityGamma: number;

    radiusTimeseries: string;
    radiusBounds: [number, number];
    radiusGamma: number;
}

export class TimeseriesMappers extends React.Component<TimeseriesMappersProps, TimeseriesMappersState> {
    constructor(props: TimeseriesMappersProps) {
        super(props);

        this.state = {
            colorTimeseries: this.props.colorTimeseries,
            colorBounds: this.props.colorBounds,
            colorGamma: this.props.colorGamma,
            colorMapping: this.props.colorMapping,

            opacityTimeseries: this.props.opacityTimeseries,
            opacityBounds: this.props.opacityBounds,
            opacityGamma: this.props.opacityGamma,

            radiusTimeseries: this.props.radiusTimeseries,
            radiusBounds: this.props.radiusBounds,
            radiusGamma: this.props.radiusGamma,
        }
    }

    public handleAestheticChange(aesthetic: AestheticType, timeseriesId: string): void {
        const newState = {
            colorTimeseries: this.state.colorTimeseries,
            opacityTimeseries: this.state.opacityTimeseries,
            radiusTimeseries: this.state.radiusTimeseries,
        };

        const key = `${aesthetic}Timeseries` as AestheticSelection;
        newState[key] = timeseriesId;

        _.toPairs(newState).forEach((pair: [AestheticSelection, string]) => {
            const [pairKey, pairVal] = pair;
            if (pairKey !== key && pairVal === timeseriesId) {
                newState[pairKey] = "nothing";
            }
        });

        this.setState(newState);
    }

    public handleCommit(): void {
        this.props.onCommit({
            colorTimeseries: this.state.colorTimeseries,
            colorBounds: this.state.colorBounds,
            colorGamma: this.state.colorGamma,
            colorMapping: this.state.colorMapping,

            opacityTimeseries: this.state.opacityTimeseries,
            opacityBounds: this.state.opacityBounds,
            opacityGamma: this.state.opacityGamma,

            radiusTimeseries: this.state.radiusTimeseries,
            radiusBounds: this.state.radiusBounds,
            radiusGamma: this.state.radiusGamma,
        });
    }

    public render(): React.ReactElement {
        const colorMapperProps: ColorMapperProps = {
            busy: this.props.busy,
            coef: 255,
            gamma: this.state.colorGamma,
            mapperLabel: "Color",
            selectedColorMapping: this.state.colorMapping,
            selectedTimeseries: this.state.colorTimeseries,
            sliderMax: 1,
            sliderMin: 0,
            sliderStep: 1 / 255,
            sliderVal: this.state.colorBounds,
            timeseriesList: this.props.timeseriesList,
            onSelectionChange: (event) => {
                this.handleAestheticChange("color", event.target.value);
            },
            onSliderChange: (event: React.ChangeEvent<{}>, value: [number, number]) => {
                this.setState({colorBounds: value});
            },
            onMappingChange: (event) => {
                this.setState({colorMapping: event.target.value});
            },
            onGammaChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value as unknown;
                this.setState({colorGamma: value as number})
            },
        }

        const opacityMapperProps: ScalarMapperProps = {
            busy: this.props.busy,
            coef: 1,
            gamma: this.state.opacityGamma,
            mapperLabel: 'Opacity',
            selectedTimeseries: this.state.opacityTimeseries,
            sliderMax: 1,
            sliderMin: 0.01,
            sliderStep: 0.01,
            sliderVal: this.state.opacityBounds,
            timeseriesList: this.props.timeseriesList,
            onSelectionChange: (event) => {
                this.handleAestheticChange("opacity", event.target.value);
            },
            onSliderChange: (event: React.ChangeEvent<{}>, value: [number, number]) => {
                this.setState({opacityBounds: value})
            },
            onGammaChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value as unknown;
                this.setState({opacityGamma: value as number})
            }
        }

        const radiusMapperProps: ScalarMapperProps = {
            busy: this.props.busy,
            coef: this.props.constants.radiusCoef,
            gamma: this.state.radiusGamma,
            mapperLabel: 'Radius',
            selectedTimeseries: this.state.radiusTimeseries,
            sliderMax: 1,
            sliderMin: 0.01,
            sliderStep: 0.01,
            sliderVal: this.state.radiusBounds,
            timeseriesList: this.props.timeseriesList,
            onSelectionChange: (event) => {
                this.handleAestheticChange("radius", event.target.value);
            },
            onSliderChange: (event: React.ChangeEvent<{}>, value: [number, number]) => {
                this.setState({radiusBounds: value})
            },
            onGammaChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value as unknown;
                this.setState({radiusGamma: value as number})
            },
        }

        let stateMatches = true;
        [
            "colorTimeseries",
            "colorBounds",
            "colorGamma",
            "colorMapping",
            "opacityTimeseries",
            "opacityBounds",
            "opacityGamma",
            "radiusTimeseries",
            "radiusBounds",
            "radiusGamma",
        ].forEach((key) => {
            stateMatches = stateMatches && _.eq(
                this.state[key as keyof(TimeseriesMappersState)],
                this.props[key as keyof(TimeseriesMappersProps)]
            )
        });

        const commitDisabled = this.props.busy || stateMatches;

        return (
            <Grid container
                  spacing={3}
                  style={{padding: "40px"}} >
                <Grid item xs={2} />
                <Grid item xs={8}>
                    <ScalarMapper {...radiusMapperProps} />
                </Grid>
                <Grid item xs={2} />
                <Grid item xs={2} />
                <Grid item xs={8}>
                    <ScalarMapper {...opacityMapperProps} />
                </Grid>
                <Grid item xs={2} />
                <Grid item xs={2} />
                <Grid item xs={8}>
                    <ColorMapper {...colorMapperProps} />
                </Grid>
                <Grid item xs>
                    <Button disabled={commitDisabled}
                            color="primary"
                            variant="contained"
                            onClick={this.handleCommit.bind(this)}
                    >
                        Commit
                    </Button>
                </Grid>
            </Grid>
        );
    }
}
