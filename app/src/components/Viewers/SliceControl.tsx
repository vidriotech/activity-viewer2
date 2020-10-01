import React from "react";

import Button from "@material-ui/core/Button";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Slider from "@material-ui/core/Slider";

// eslint-disable-next-line import/no-unresolved
import {AVConstants} from "../../constants";
// eslint-disable-next-line import/no-unresolved
import {SliceType} from "../../models/enums";

export interface SliceControlProps {
    constants: AVConstants;
    onCommit(sliceType: SliceType, bounds: number[]): void;
}

interface SliceControlState {
    projectionValues: number[];
    selectedSliceType: SliceType;
}

export class SliceControl extends React.Component<SliceControlProps, SliceControlState> {
    constructor(props: SliceControlProps) {
        super(props);

        this.state = {
            projectionValues: [-500, 0, 500].map(x => x + this.props.constants.CoronalMax / 2),
            selectedSliceType: SliceType.CORONAL,
        };
    }

    private handleUpdateSelect(event: React.ChangeEvent<{ name?: string; value: any }>): void {
        const selectedSliceType = event.target.value as SliceType;

        let projectionCenter: number;
        switch (selectedSliceType) {
            case SliceType.CORONAL:
                projectionCenter = this.props.constants.CoronalMax / 2;
                break;
            case SliceType.SAGITTAL:
                projectionCenter = this.props.constants.SagittalMax / 2;
                break;
        }

        const projectionValues = [-500, 0, 500].map(x => projectionCenter + x);

        this.setState({selectedSliceType, projectionValues});
    }

    private handleUpdateSlider(_event: never, newData: number[]) {
        // eslint-disable-next-line prefer-const
        const [min, center, max] = newData;

        this.setState({
            projectionValues: [
                Math.min(min, center),
                center,
                Math.max(max, center),
            ]
        }, () => console.log(this.state.projectionValues));
    }

    public render(): React.ReactNode {
        const menuItems = ["Coronal", "Sagittal"].map((type) => (
            <MenuItem key={type.toLowerCase()} value={type.toLowerCase()}>
                {type}
            </MenuItem>
        ));

        const sliderMin = 0;
        let sliderMax: number;
        switch (this.state.selectedSliceType) {
            case SliceType.CORONAL:
                sliderMax = this.props.constants.CoronalMax;
                break;
            case SliceType.SAGITTAL:
                sliderMax = this.props.constants.SagittalMax;
                break;
        }

        const sliderMarks = [sliderMin, 0, sliderMax].map((x) => ({
            label: x.toString(),
            value: x,
        }));

        return (
            <div>
                <FormControl>
                    <InputLabel id={"slice-type-input-label"}>
                        Slice type
                    </InputLabel>
                    <Select labelId={"slice-type-select"}
                            id={"slice-type"}
                            value={this.state.selectedSliceType}
                            onChange={this.handleUpdateSelect.bind(this)}>
                        {menuItems}
                    </Select>
                </FormControl>
                <Slider min={sliderMin}
                        max={sliderMax}
                        step={10}
                        marks={sliderMarks}
                        value={this.state.projectionValues}
                        valueLabelDisplay={"on"}
                        onChange={this.handleUpdateSlider.bind(this)} />
                <Button color={"secondary"}
                        variant={"contained"}
                        onClick={(): void => {
                            this.props.onCommit(this.state.selectedSliceType, this.state.projectionValues);
                        }}>
                    Commit
                </Button>
            </div>
        );
    }
}
