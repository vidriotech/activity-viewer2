import React from 'react';

import Grid from '@material-ui/core/Grid';

import { ScalarMapper, IScalarMapperProps } from './ScalarMapper';

export interface ITimeseriesControlsProps {
    opacityBounds: number[],
    radiusBounds: number[],
    selectedOpacity: string,
    selectedRadius: string,
    timeseries: string[],
    onOpacitySelectionChange(event: React.ChangeEvent<{ name?: string; value: any; }>): void,
    onOpacitySliderChange(event: any, newData: number[], commit: boolean): void,
    onRadiusSelectionChange(event: React.ChangeEvent<{ name?: string; value: any; }>): void,
    onRadiusSliderChange(event: any, newData: number[], commit: boolean): void,
}

export function TimeseriesControls(props: ITimeseriesControlsProps) {
    const radiusMapperProps: IScalarMapperProps = {
        mapperLabel: 'Radius',
        sliderMax: 500,
        sliderMin: 5,
        sliderStep: 5,
        sliderVal: props.radiusBounds,
        selectedTimeseries: props.selectedRadius,
        timeseries: props.timeseries,
        onSelectionChange: props.onRadiusSelectionChange,
        onSliderChange: props.onRadiusSliderChange,
    }

    const opacityMapperProps: IScalarMapperProps = {
        mapperLabel: 'Opacity',
        sliderMax: 1,
        sliderMin: 0.01,
        sliderStep: 0.01,
        sliderVal: props.opacityBounds,
        selectedTimeseries: props.selectedOpacity,
        timeseries: props.timeseries,
        onSelectionChange: props.onOpacitySelectionChange,
        onSliderChange: props.onOpacitySliderChange,
    }

    return (
        <Grid container
                item
                xs
                direction='column'
                justify='flex-start'
                spacing={3}>
            <Grid item xs>
                <ScalarMapper {...radiusMapperProps} />
            </Grid>
            <Grid item xs>
                <ScalarMapper {...opacityMapperProps} />
            </Grid>
        </Grid>);
}
