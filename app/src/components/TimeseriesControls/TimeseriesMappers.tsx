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

export interface TimeseriesMappersProps extends AestheticProps {
    busy: boolean;
    timeseriesList: string[];
    onCommit(props: AestheticProps): void;
    onAestheticSelectionChange(aesthetic: AestheticType, value: string): void;
    onAestheticSliderChange(event: React.ChangeEvent<{}>, value: [number, number]): void;
    onColorMapperSelectionChange(event: React.ChangeEvent<{ name?: string; value: string }>): void;
}

interface TimeseriesMappersState {
    colorBounds: [number, number];
    opacityBounds: [number, number];
    radiusBounds: [number, number];
    selectedColor: string;
    selectedColorMapping: string;
    selectedOpacity: string;
    selectedRadius: string;
}

export class TimeseriesMappers extends React.Component<TimeseriesMappersProps, TimeseriesMappersState> {
    constructor(props: TimeseriesMappersProps) {
        super(props);

        this.state = {
            colorBounds: [0, 255],
            opacityBounds: [0.01, 1],
            radiusBounds: [5, 500],
            selectedColor: "nothing",
            selectedColorMapping: "bwr",
            selectedOpacity: "nothing",
            selectedRadius: "nothing",
        }
    }

    public handleAestheticChange(aesthetic: AestheticType, timeseriesId: string): void {
        const newState = {
            selectedColor: this.state.selectedColor,
            selectedOpacity: this.state.selectedOpacity,
            selectedRadius: this.state.selectedRadius,
        };

        const key = `selected${_.startCase(aesthetic)}` as AestheticSelection;
        newState[key] = timeseriesId;

        _.toPairs(newState).forEach((pair) => {
            const [pairKey, pairVal] = pair;
            if (pairKey !== key && pairVal === timeseriesId) {
                newState[pairKey as AestheticSelection] = "nothing";
            }
        });

        this.setState(newState);
    }

    public handleCommit(): void {
        this.props.onCommit({
            colorBounds: this.state.colorBounds,
            opacityBounds: this.state.opacityBounds,
            radiusBounds: this.state.radiusBounds,
            selectedColor: this.state.selectedColor,
            selectedColorMapping: this.state.selectedColorMapping,
            selectedOpacity: this.state.selectedOpacity,
            selectedRadius: this.state.selectedRadius,
        });
    }

    public render(): React.ReactElement {
        const colorMapperProps: ColorMapperProps = {
            mapperLabel: "Color",
            selectedColorMapping: this.state.selectedColorMapping,
            selectedTimeseries: this.state.selectedColor,
            sliderMax: 255,
            sliderMin: 0,
            sliderStep: 1,
            sliderVal: this.state.colorBounds,
            timeseriesList: this.props.timeseriesList,
            onSelectionChange: (event) => {
                this.handleAestheticChange("color", event.target.value);
            },
            onSliderChange: (event: React.ChangeEvent<{}>, value: [number, number]) => {
                this.setState({colorBounds: value});
            },
            onMappingChange: (event) => {
                this.setState({selectedColorMapping: event.target.value});
            },
        }

        const opacityMapperProps: ScalarMapperProps = {
            mapperLabel: 'Opacity',
            selectedTimeseries: this.state.selectedOpacity,
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
        }

        const radiusMapperProps: ScalarMapperProps = {
            mapperLabel: 'Radius',
            selectedTimeseries: this.state.selectedRadius,
            sliderMax: 500,
            sliderMin: 5,
            sliderStep: 5,
            sliderVal: this.state.radiusBounds,
            timeseriesList: this.props.timeseriesList,
            onSelectionChange: (event) => {
                this.handleAestheticChange("radius", event.target.value);
            },
            onSliderChange: (event: React.ChangeEvent<{}>, value: [number, number]) => {
                this.setState({radiusBounds: value})
            },
        }

        let stateMatches = true;
        [
            "colorBounds",
            "opacityBounds",
            "radiusBounds",
            "selectedColor",
            "selectedColorMapping",
            "selectedOpacity",
            "selectedRadius"
        ].forEach((key) => {
            stateMatches = stateMatches && _.eq(
                this.state[key as keyof(TimeseriesMappersState)],
                this.props[key as keyof(TimeseriesMappersProps)]
            )
        });

        const commitDisabled = this.props.busy || stateMatches;

        return (
            <Grid container
                  spacing={3} >
                <Grid item xs>
                    <ScalarMapper {...radiusMapperProps} />
                </Grid>
                <Grid item xs>
                    <ScalarMapper {...opacityMapperProps} />
                </Grid>
                <Grid item xs>
                    <ColorMapper {...colorMapperProps} />
                </Grid>
                <Grid item xs={2}>
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
