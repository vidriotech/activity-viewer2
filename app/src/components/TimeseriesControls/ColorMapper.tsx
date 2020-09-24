import React from "react";

import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import FormControl from "@material-ui/core/FormControl";

// eslint-disable-next-line import/no-unresolved
import {ScalarMapperProps} from "./ScalarMapper";
import Typography from "@material-ui/core/Typography";
import Slider from "@material-ui/core/Slider";


export interface ColorMapperProps extends ScalarMapperProps {
    selectedColorMapping: string;
    onMappingChange(event: React.ChangeEvent<{ name?: string; value: string }>): void;
}

export function ColorMapper(props: ColorMapperProps): React.ReactElement {
    const colorMapOptions = [
        "bwr",
        "PiYG",
        "jet",
        "rainbow",
        "gray",
        "hot",
        "hsv"
    ];

    const tsMenuItems = [
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

    const cmMenuItems = [
        <MenuItem key={"nothing"}
                  value={"nothing"}>
            No mapping
        </MenuItem>
    ].concat(
        colorMapOptions.map(
            mapping => (
                <MenuItem key={mapping} value={mapping}>
                    {mapping}
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
            <Grid container
                  item
                  direction="column"
                  xs={3}>
                <Grid item>
                    <FormControl>
                        <InputLabel id={"aesthetic-mapper-color-label"}>
                            Color
                        </InputLabel>
                        <Select
                            labelId={"aesthetic-mapper-color-select"}
                            id={"aesthetic-mapper-color"}
                            defaultValue={"nothing"}
                            value={props.selectedTimeseries}
                            onChange={props.onSelectionChange}>
                            {tsMenuItems}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item>
                    <FormControl>
                        <InputLabel id={"aesthetic-mapper-color-mapper-label"}>
                            Mapping
                        </InputLabel>
                        <Select
                            disabled={props.selectedTimeseries === "nothing"}
                            labelId={"aesthetic-mapper-color-mapper-select"}
                            id={"aesthetic-mapper-color-mapper"}
                            defaultValue={"bwr"}
                            value={props.selectedColorMapping}
                            onChange={props.onMappingChange}>
                            {cmMenuItems}
                        </Select>
                    </FormControl>
                </Grid>
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
                        disabled={props.selectedTimeseries === "nothing"} />
            </Grid>
        </Grid>
    );
}
