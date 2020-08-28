import React from 'react';
import * as _ from 'underscore';

import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';

import { IPenetrationData } from '../../models/apiModels';
import { StatsHistogram, IStatsHistogramProps } from './StatsHistogram';

import { AVConstants } from '../../constants';
import { IFilterCondition } from '../../models/filter';


export interface IFilterControlsProps {
    availablePenetrations: IPenetrationData[],
    constants: AVConstants,
    statsData: number[],
    filterConditions: IFilterCondition[],
    selectedStat: string,
    onNewFilterCondition(condition: IFilterCondition): void,
    onStatSelectionChange(event: any): void,
}

export function FilterControls(props: IFilterControlsProps) {
    const availableStats = _.union(...props.availablePenetrations.map(pen => pen.unitStats));
    const menuItems = _.union(
        [<MenuItem key='nothing' value='nothing'>No selection</MenuItem>],
        availableStats.map(stat => {
            return <MenuItem value={stat}
                             key={stat}>
                {stat}
            </MenuItem>
        })
    );

    const histogramProps: IStatsHistogramProps = {
        constants: props.constants,
        data: props.statsData,
        height: 300,
        statName: props.selectedStat,
        width: 400,
        onNewFilterCondition: props.onNewFilterCondition,
    }

    return (
        <Grid container
              direction='column'
              spacing={1}>
            <Grid item xs>
                <FormControl>
                    <InputLabel id={`stats-mapper-label`}>
                        Statistic
                    </InputLabel>
                    <Select
                        labelId={`stats-mapper-select-label`}
                        id={`stats-mapper-select`}
                        defaultValue='nothing'
                        value={props.selectedStat}
                        onChange={props.onStatSelectionChange}>
                        {menuItems}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs>
                <StatsHistogram {...histogramProps} />
            </Grid>
        </Grid>
    );
}
