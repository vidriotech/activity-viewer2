import React from "react";

import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import FormControl from "@material-ui/core/FormControl";


export interface ColorMapperProps {
    selectedColorMapping: string;
    selectedTimeseries: string;
    timeseriesList: string[];
    onSelectionChange(event: React.ChangeEvent<{ name?: string; value: any }>): void;
    onMappingChange(event: React.ChangeEvent<{ name?: string; value: any }>): void;
}

export function ColorMapper(props: ColorMapperProps) {
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
        <MenuItem key={"default"}
                  value={"default"}>
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
    
    return (
        <Grid container
              spacing={0}>
            <Grid item xs={3}>
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
            <Grid item xs={3}>
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
    );
}
