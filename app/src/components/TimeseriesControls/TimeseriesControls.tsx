import React from 'react';

import Grid from '@material-ui/core/Grid';

// eslint-disable-next-line import/no-unresolved
import {ColorMapper, ColorMapperProps} from './ColorMapper';
// eslint-disable-next-line import/no-unresolved
import { ScalarMapper, ScalarMapperProps } from './ScalarMapper';

export interface TimeseriesControlsProps {
    opacityBounds: number[];
    radiusBounds: number[];
    selectedColor: string;
    selectedColorMapping: string;
    selectedOpacity: string;
    selectedRadius: string;
    timeseriesList: string[];
    onColorSelectionChange(event: React.ChangeEvent<{ name?: string; value: any }>): void;
    onMapperSelectionChange(event: React.ChangeEvent<{ name?: string; value: any }>): void;
    onOpacitySelectionChange(event: React.ChangeEvent<{ name?: string; value: any }>): void;
    onOpacitySliderChange(event: never, newData: number[], commit: boolean): void;
    onRadiusSelectionChange(event: React.ChangeEvent<{ name?: string; value: any }>): void;
    onRadiusSliderChange(event: never, newData: number[], commit: boolean): void;
}

export function TimeseriesControls(props: TimeseriesControlsProps) {
    const radiusMapperProps: ScalarMapperProps = {
        mapperLabel: 'Radius',
        sliderMax: 500,
        sliderMin: 5,
        sliderStep: 5,
        sliderVal: props.radiusBounds,
        selectedTimeseries: props.selectedRadius,
        timeseriesList: props.timeseriesList,
        onSelectionChange: props.onRadiusSelectionChange,
        onSliderChange: props.onRadiusSliderChange,
    }

    const opacityMapperProps: ScalarMapperProps = {
        mapperLabel: 'Opacity',
        sliderMax: 1,
        sliderMin: 0.01,
        sliderStep: 0.01,
        sliderVal: props.opacityBounds,
        selectedTimeseries: props.selectedOpacity,
        timeseriesList: props.timeseriesList,
        onSelectionChange: props.onOpacitySelectionChange,
        onSliderChange: props.onOpacitySliderChange,
    }

    const colorMapperProps: ColorMapperProps = {
        selectedColorMapping: props.selectedColorMapping,
        selectedTimeseries: props.selectedColor,
        timeseriesList: props.timeseriesList,
        onSelectionChange: props.onColorSelectionChange,
        onMappingChange: props.onMapperSelectionChange,
    }

    return (
        <Grid container
              direction='column'
              spacing={0} >
            <Grid item xs>
                <ScalarMapper {...radiusMapperProps} />
            </Grid>
            <Grid item xs>
                <ScalarMapper {...opacityMapperProps} />
            </Grid>
            <Grid item xs>
                <ColorMapper {...colorMapperProps} />
            </Grid>
        </Grid>);
}
