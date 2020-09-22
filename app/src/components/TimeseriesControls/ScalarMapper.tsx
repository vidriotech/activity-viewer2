import React from "react";
import * as _ from "underscore";

import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Slider from "@material-ui/core/Slider";
import Typography from "@material-ui/core/Typography";


export interface ScalarMapperProps {
    busy: boolean;
    mapperLabel: string;
    sliderMax: number;
    sliderMin: number;
    sliderStep: number;
    sliderVal: number[];
    selectedTimeseries: string;
    timeseriesList: string[];
    onSelectionChange(event: React.ChangeEvent<{
        name?: string;
        value: string;
    }>): void;
    onSliderChange(event: any, newData: number[], commit: boolean): void;
}

export function ScalarMapper(props: ScalarMapperProps): React.ReactElement {
    const menuItems = [
        <MenuItem key={"nothing"}
                  value={"nothing"}>
            No mapping
        </MenuItem>
    ].concat(
        props.timeseriesList.map(
            series => (
                <MenuItem key={series} value={series}>
                    {series}
                </MenuItem>
            )
        )
    );

    const sliderMarks = [
        props.sliderMin,
        props.sliderMax,
        props.sliderMax / 2
    ].map((x) => ({
        label: x === Math.floor(x) ? x.toString() : x.toFixed(2),
        value: x
    }));

    return (
        <Grid container
              spacing={0}>
            <Grid item xs={3}>
                <FormControl>
                    <InputLabel id={`aesthetic-mapper-${props.mapperLabel}-label`}>
                        {props.mapperLabel}
                    </InputLabel>
                    <Select
                        disabled={props.busy}
                        labelId={`aesthetic-mapper-${props.mapperLabel}-select`}
                        id={`aesthetic-mapper-${props.mapperLabel}`}
                        defaultValue="nothing"
                        value={props.selectedTimeseries}
                        onChange={props.onSelectionChange}>
                        {menuItems}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item
                  xs={9} >
                <Typography variant="caption"
                            display="block"
                            gutterBottom>
                    Transformation range
                </Typography>
                <Slider min={props.sliderMin}
                        max={props.sliderMax}
                        step={props.sliderStep}
                        marks={sliderMarks}
                        value={props.sliderVal}
                        onChange={(evt, newData) => props.onSliderChange(evt, newData as number[], false)}
                        onChangeCommitted={(evt, newData) => props.onSliderChange(evt, newData as number[], true)}
                        disabled={props.busy || props.selectedTimeseries === "nothing"} />
            </Grid>
        </Grid>
    );
}