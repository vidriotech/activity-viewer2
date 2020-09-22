import React from 'react';

import Grid from '@material-ui/core/Grid';

// eslint-disable-next-line import/no-unresolved
import {AestheticType} from "../../models/aestheticMapping";
// eslint-disable-next-line import/no-unresolved
import {ColorMapper, ColorMapperProps} from './ColorMapper';
// eslint-disable-next-line import/no-unresolved
import { ScalarMapper, ScalarMapperProps } from './ScalarMapper';

export interface TimeseriesControlsProps {
    busy: boolean;
    opacityBounds: number[];
    radiusBounds: number[];
    selectedColor: string;
    selectedColorMapping: string;
    selectedOpacity: string;
    selectedRadius: string;
    timeseriesList: string[];
    onAestheticSelectionChange(aesthetic: AestheticType, value: string): void;
    onMapperSelectionChange(event: React.ChangeEvent<{ name?: string; value: string }>): void;
    onOpacitySliderChange(event: never, newData: number[], commit: boolean): void;
    onRadiusSliderChange(event: never, newData: number[], commit: boolean): void;
}

export function TimeseriesControls(props: TimeseriesControlsProps): React.ReactElement {
    const radiusMapperProps: ScalarMapperProps = {
        busy: props.busy,
        mapperLabel: 'Radius',
        sliderMax: 500,
        sliderMin: 5,
        sliderStep: 5,
        sliderVal: props.radiusBounds,
        selectedTimeseries: props.selectedRadius,
        timeseriesList: props.timeseriesList,
        onSelectionChange: (event) => {
            props.onAestheticSelectionChange("radius", event.target.value);
        },
        onSliderChange: props.onRadiusSliderChange,
    }

    const opacityMapperProps: ScalarMapperProps = {
        busy: props.busy,
        mapperLabel: 'Opacity',
        sliderMax: 1,
        sliderMin: 0.01,
        sliderStep: 0.01,
        sliderVal: props.opacityBounds,
        selectedTimeseries: props.selectedOpacity,
        timeseriesList: props.timeseriesList,
        onSelectionChange: (event) => {
            props.onAestheticSelectionChange("opacity", event.target.value);
        },
        onSliderChange: props.onOpacitySliderChange,
    }

    const colorMapperProps: ColorMapperProps = {
        busy: props.busy,
        selectedColorMapping: props.selectedColorMapping,
        selectedTimeseries: props.selectedColor,
        timeseriesList: props.timeseriesList,
        onSelectionChange: (event) => {
            props.onAestheticSelectionChange("color", event.target.value);
        },
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
