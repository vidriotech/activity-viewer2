import React from 'react';
import * as _ from 'underscore';

import Container from '@material-ui/core/Container';
import FormControl from '@material-ui/core/FormControl';
import Grid from '@material-ui/core/Grid';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import Select from '@material-ui/core/Select';

import { IPenetrationData } from '../../models/apiModels';
import { StatsHistogram, IStatsHistogramProps } from './StatsHistogram';

import { AVConstants } from '../../constants';
import { IFilterCondition } from '../../models/filter';


export interface IStatsControlsProps {
    availablePenetrations: IPenetrationData[],
    constants: AVConstants,
    data: number[],
    selectedStat: string,
    onNewFilterCondition(condition: IFilterCondition): void,
    onSelectionChange(event: any): void,
}

export function StatsControls(props: IStatsControlsProps) {
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
        data: props.data,
        height: 300,
        statName: props.selectedStat,
        width: 400,
        onNewFilterCondition: props.onNewFilterCondition,
    }

    return (
        <Grid container
              direction='column'
              spacing={3}>
            <Grid item xs>
                <FormControl>
                    <InputLabel id={`stats-mapper-label`}>
                        Unit statistic
                    </InputLabel>
                    <Select
                        labelId={`stats-mapper-select-label`}
                        id={`stats-mapper-select`}
                        defaultValue='nothing'
                        value={props.selectedStat}
                        onChange={props.onSelectionChange}>
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
