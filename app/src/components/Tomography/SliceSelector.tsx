import React from "react";

// eslint-disable-next-line import/no-unresolved
import {SliceType} from "../../models/enums";
import Grid from "@material-ui/core/Grid";
import Switch from "@material-ui/core/Switch";
import FormGroup from "@material-ui/core/FormGroup";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";
import Slider from "@material-ui/core/Slider";
import FormControlLabel from "@material-ui/core/FormControlLabel";

export interface SliceSelectorProps {
    busy: boolean;
    disableSlider: boolean;

    sliceType: SliceType;

    checked: boolean;
    sliderLimits: [number, number];
    sliderValues: [number, number];

    templateChecked: boolean;

    onToggle(): void;
    onToggleTemplate(): void;
    onUpdateSlider(values: [number, number]): void;
}

export function SliceSelector(props: SliceSelectorProps): React.ReactElement {
    let label: string;
    switch (props.sliceType) {
        case SliceType.CORONAL:
            label = "Coronal";
            break;
        case SliceType.SAGITTAL:
            label = "Sagittal";
            break;
    }

    const sliderMarks = props.sliderLimits.map((value) => ({
        label: `${(value/1000).toFixed(2)} mm`,
        value: value
    }));

    return (
        <Grid container>
            <Grid item xs={12}>
                <FormControl>
                    <FormGroup row>
                        <FormControlLabel control={<Switch checked={props.checked}
                                                           disabled={props.busy}
                                                           onChange={props.onToggle} />}
                                          label={label} />
                        <FormControlLabel control={<Switch checked={props.templateChecked}
                                                           disabled={props.busy || !props.checked}
                                                           onChange={props.onToggleTemplate} />}
                                          label="Show template" />

                    </FormGroup>
                </FormControl>
            </Grid>
            <Grid item xs={12}>
                <Slider min={props.sliderLimits[0]}
                        max={props.sliderLimits[1]}
                        marks={sliderMarks}
                        value={props.sliderValues}
                        disabled={props.busy || props.disableSlider || !props.checked}
                        onChange={(_e, values: [number, number]) => {
                            props.onUpdateSlider(values);
                        }} />
            </Grid>
        </Grid>
    );
}
