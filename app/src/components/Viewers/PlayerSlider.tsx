import React from 'react';

import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import Input from '@material-ui/core/Input';
import Slider from '@material-ui/core/Slider';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { createStyles, Theme, makeStyles } from '@material-ui/core/styles';

import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';
import PauseIcon from '@material-ui/icons/Pause';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import RepeatIcon from '@material-ui/icons/Repeat';
import RepeatOneIcon from '@material-ui/icons/RepeatOne';
import StopIcon from '@material-ui/icons/Stop';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        margin: {
            margin: theme.spacing(1),
        },
        extendedIcon: {
            marginRight: theme.spacing(1),
        },
    }),
);

export interface PlayerSliderProps {
    frameRate: number,
    isPlaying: boolean,
    isRecording: boolean,
    loopAnimation: 'once' | 'repeat',
    timeMax: number,
    timeMin: number,
    timeStep: number,
    timeVal: number,
    onFrameRateUpdate(frameRate: number): void,
    onLoopToggle(): void,
    onPlayToggle(): void,
    onRecordToggle(): void,
    onSliderChange(event: any, timeVal: number): void,
    onStopClick(): void,
}

export function PlayerSlider(props: PlayerSliderProps) {
    const classes = useStyles();

    let marks = [{
        label: '',
        value: props.timeMin
    }];

    if (props.timeMin < props.timeMax) {
        marks[0].label = props.timeMin.toFixed(2) + ' s';
        marks.push({
            label: props.timeMax.toFixed(2) + ' s',
            value: props.timeMax
        });

        if (props.timeMin < 0 && 0 < props.timeMax) {
            marks.push({
                label: '0 s',
                value: 0,
            });
        }
    }

    const disabled = marks.length === 1;

    const playPauseButton = (
        <IconButton size='small'
                    className={classes.margin}
                    disabled={disabled}
                    onClick={props.onPlayToggle}>
            {props.isPlaying ? (
                <PauseIcon titleAccess='pause animation'
                           fontSize='large' />
            ) : (
                <PlayArrowIcon titleAccess='play animation'
                            fontSize='large' />
            )}
        </IconButton>
    );

    const loopToggleButton = (
        <IconButton size='small'
                    className={classes.margin}
                    disabled={disabled}
                    onClick={props.onLoopToggle}>
            {props.loopAnimation === 'once' ? (
                <RepeatOneIcon titleAccess='loop once'
                               fontSize='large' />
            ) : (
                <RepeatIcon titleAccess='loop playback'
                            fontSize='large' />
            )}
        </IconButton>
    );

    return (
        <Grid container
              spacing={2}
              justify='flex-start'>
            <Grid item xs={8}>
                <Slider min={props.timeMin}
                        max={props.timeMax}
                        step={props.timeStep}
                        marks={marks}
                        value={props.timeVal}
                        disabled={marks.length===1}
                        onChange={props.onSliderChange}
                />
            </Grid>
            <Grid item xs={4}>
                <Typography>
                    {disabled ? '' : `${props.timeVal.toFixed(2)} s`}
                </Typography>
            </Grid>
            <Grid item xs>
                <IconButton size='small'
                            className={classes.margin}
                            disabled={disabled}
                            onClick={props.onRecordToggle}>
                    <FiberManualRecordIcon titleAccess='record playback'
                                           color={props.isRecording ? 'error' : 'inherit'}
                                           fontSize='large' />
                </IconButton>
                {playPauseButton}
                <IconButton size='small'
                            className={classes.margin}
                            disabled={disabled}
                            onClick={props.onStopClick}>
                    <StopIcon titleAccess='stop animation'
                              fontSize='large' />
                </IconButton>
                {loopToggleButton}
                <Input type='number'
                       inputProps={{ min: 1, max: 60, name: 'Frames/sec' }}
                       value={props.frameRate}
                       disabled={disabled}
                       onChange={
                           (event: React.ChangeEvent<HTMLInputElement>) => {
                               const value = event.target.value as unknown;
                               props.onFrameRateUpdate(value as number);
                           }
                       } />
            </Grid>
        </Grid>
    )
}