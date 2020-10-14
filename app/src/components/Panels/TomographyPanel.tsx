import React from "react";

// eslint-disable-next-line import/no-unresolved
// eslint-disable-next-line import/no-unresolved
import {SliceImageType, SliceType} from "../../models/enums";

// eslint-disable-next-line import/no-unresolved
import FormControlLabel from "@material-ui/core/FormControlLabel";
import RadioGroup from "@material-ui/core/RadioGroup";
import Radio from "@material-ui/core/Radio";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import Slider from "@material-ui/core/Slider";
import {CoronalMax, SagittalMax} from "../../constants";
import FormGroup from "@material-ui/core/FormGroup";
import Switch from "@material-ui/core/Switch";
import {tab10Orange} from "../../styles";

export interface TomographyPanelProps {
    busy: boolean;
    isSlicing: boolean;
    isLocked: boolean;
    tomographySliceShown: boolean;

    showTestSlice: boolean;
    testSliceBounds: [number, number];

    sliceCoordinate: number;

    sliceType: SliceType;
    sliceImageType: SliceImageType;

    onBeginSlicing(): void;
    onCancelSlicing(): void;
    onCommitSlicing(): void;
    onClearSlicing(): void;
    onSetSliceType(sliceType: SliceType): void;
    onSetSliceImageType(sliceImageType: SliceImageType): void;
    onSetSliceCoordinate(coordinate: number): void;

    onSelectSliceType(sliceType: SliceType, testSliceBounds: [number, number], showTemplate: boolean): void;
    onUnselectSliceType(): void;
    onUpdateTestSliceBounds(testSliceBounds: [number, number]): void;
    onToggleTemplateDisplay(): void;
}

export class TomographyPanel extends React.Component<TomographyPanelProps, {}> {
    constructor(props: TomographyPanelProps) {
        super(props);
    }
    private renderCoordinateSlider(): React.ReactElement {
        const sliderMax = this.props.sliceType === SliceType.CORONAL ?
            CoronalMax :
            SagittalMax;
        const sliderMarks = [
            {label: "0.0 mm", value: 0},
            {label: `${(sliderMax / 1000).toFixed(2)} mm`, value: sliderMax}
        ];

        return (
            <Slider min={0}
                    max={sliderMax}
                    marks={sliderMarks}
                    value={this.props.sliceCoordinate}
                    disabled={this.props.busy || !this.props.tomographySliceShown}
                    onChange={(_e, value: number) => {
                        this.props.onSetSliceCoordinate(value);
                    }} />
        );
    }

    private renderTestSlider(): React.ReactElement {
        const sliderMax = this.props.sliceType === SliceType.CORONAL ?
            CoronalMax :
            SagittalMax;
        const sliderMarks = [
            {label: "0.0 mm", value: 0},
            {label: `${(sliderMax / 1000).toFixed(2)} mm`, value: sliderMax}
        ];

        return (
            <Slider min={0}
                    max={sliderMax}
                    marks={sliderMarks}
                    value={this.props.testSliceBounds}
                    disabled={this.props.busy || !this.props.isSlicing}
                    onChange={(_e, values: [number, number]) => {
                        this.props.onUpdateTestSliceBounds(values);
                    }} />
        )
    }

    public render(): React.ReactElement {
        // begin or commit slicing
        const submitButton = this.props.isSlicing ? (
            <Button disabled={this.props.busy}
                    color="primary"
                    variant="contained"
                    onClick={this.props.onCommitSlicing}>
                Commit Slicing
            </Button>
        ): (
            <Button disabled={this.props.busy || this.props.isSlicing || this.props.isLocked || this.props.tomographySliceShown}
                    color="primary"
                    variant="contained"
                    onClick={this.props.onBeginSlicing}>
                Begin Slicing
            </Button>
        );

        // remove shown slice
        const clearButton = this.props.isSlicing ? (
            <Button disabled={this.props.busy || !this.props.isSlicing}
                    color="secondary"
                    variant="contained"
                    onClick={this.props.onCancelSlicing}>
                Cancel Slicing
            </Button>
        ): (
            <Button disabled={this.props.busy || !this.props.tomographySliceShown}
                    color="secondary"
                    variant="contained"
                    onClick={this.props.onClearSlicing}>
                Clear Slice
            </Button>
        );

        // realign test slices
        const testSlider = this.renderTestSlider();

        // move slices
        const coordinateSlider = this.renderCoordinateSlider();

        const radioDisabled = this.props.busy || this.props.isSlicing || this.props.isLocked || this.props.tomographySliceShown;

        return (
            <Container disableGutters
                       style={{justifyContent: "center"}} >
                <Container disableGutters
                           style={{
                               backgroundColor: tab10Orange,
                               borderTop: "1px solid black",
                               borderBottom: "1px solid black",
                               color: "white",
                               padding: 5
                           }} >
                    <Typography component="h5"
                                variant="body1"
                                align="center">
                        Tomography
                    </Typography>
                </Container>
                <Container disableGutters
                           style={{
                               paddingLeft: 40,
                               paddingRight: 40
                           }} >
                    <FormGroup row>
                        <RadioGroup row
                                    aria-label="subset" name="subset"
                                    value={this.props.sliceType}
                                    onChange={
                                        (event): void => {
                                            this.props.onSetSliceType(Number(event.target.value) as SliceType)
                                        }} >
                            <FormControlLabel
                                disabled={radioDisabled}
                                value={SliceType.CORONAL}
                                control={<Radio color="default" />}
                                label="Coronal"
                                labelPlacement="bottom"
                            />
                            <FormControlLabel
                                disabled={radioDisabled}
                                value={SliceType.SAGITTAL}
                                control={<Radio color="default" />}
                                label="Sagittal"
                                labelPlacement="bottom"
                            />
                        </RadioGroup>
                        <FormControlLabel control={<Switch checked={this.props.sliceImageType === SliceImageType.TEMPLATE}
                                                           disabled={this.props.busy || !this.props.tomographySliceShown}
                                                           onChange={() => {
                                                               if (this.props.sliceImageType === SliceImageType.ANNOTATION) {
                                                                   this.props.onSetSliceImageType(SliceImageType.TEMPLATE);
                                                               } else {
                                                                   this.props.onSetSliceImageType(SliceImageType.ANNOTATION);
                                                               }
                                                           }} />}
                                          label="Show template" />
                        <ButtonGroup>
                            {submitButton}
                            {clearButton}
                        </ButtonGroup>
                    </FormGroup>
                    {testSlider}
                    {coordinateSlider}
                </Container>
            </Container>
        );
    }
}