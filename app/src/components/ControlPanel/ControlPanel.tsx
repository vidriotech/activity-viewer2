import React from 'react';
import * as _ from 'underscore';

import Grid from '@material-ui/core/Grid';

import { AVConstants } from '../../constants';
import { IPenetrationData } from '../../models/apiModels';
import { IFilterCondition } from '../../models/filter';

import { TimeseriesControls, ITimeseriesControlsProps } from './TimeseriesControls';
import { StatsControls, IStatsControlsProps } from './StatsControls';

export interface IControlPanelProps {
    availablePenetrations: IPenetrationData[],
    constants: AVConstants,
    opacityBounds: number[],
    radiusBounds: number[],
    selectedOpacity: string,
    selectedRadius: string,
    selectedStat: string,
    statsData: number[],
    onNewFilterCondition(condition: IFilterCondition): void,
    onOpacitySelectionChange(event: React.ChangeEvent<{name?: string; value: any;}>): void,
    onOpacitySliderChange(event: any, newData: number[], commit: boolean): void,
    onOpacitySelectionChange(event: React.ChangeEvent<{name?: string; value: any;}>): void,
    onRadiusSelectionChange(event: React.ChangeEvent<{ name?: string; value: any; }>): void,
    onRadiusSliderChange(event: any, newData: number[], commit: boolean): void,
    onStatSelectionChange(event: any): void,
}


export function ControlPanel(props: IControlPanelProps) {
    const timeseriesControlsProps: ITimeseriesControlsProps = {
        opacityBounds: props.opacityBounds,
        radiusBounds: props.radiusBounds,
        selectedOpacity: props.selectedOpacity,
        selectedRadius: props.selectedRadius,
        timeseries: _.uniq(
            _.flatten(props.availablePenetrations.map(
                pen => pen.timeseries
            )).sort(), true
        ),
        onOpacitySelectionChange: props.onOpacitySelectionChange,
        onOpacitySliderChange: props.onOpacitySliderChange,
        onRadiusSelectionChange: props.onRadiusSelectionChange,
        onRadiusSliderChange: props.onRadiusSliderChange,
    };

    const statsControlsProps: IStatsControlsProps = {
        availablePenetrations: props.availablePenetrations,
        constants: props.constants,
        data: props.statsData,
        selectedStat: props.selectedStat,
        onNewFilterCondition: props.onNewFilterCondition,
        onSelectionChange: props.onStatSelectionChange,
    }

    return (
        <Grid container
              direction='column'>
            <Grid item xs>
                <TimeseriesControls {...timeseriesControlsProps}/>
            </Grid>
            <Grid item xs>
                <StatsControls {...statsControlsProps} />
            </Grid>
        </Grid>
    );
}
