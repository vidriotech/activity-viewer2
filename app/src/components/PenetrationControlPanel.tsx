import React from 'react';

import { Dropdown, List, SemanticICONS, Container, Grid, DropdownProps, Header } from 'semantic-ui-react';

import { AVConstants } from '../constants';
import { IPenetration } from '../models/penetrationModel';
import { PenetrationControls, IPenetrationControlsProps } from './PenetrationControls';
import { IPenetrationResponse, IPenetrationData } from '../models/apiModels';

export interface IPenetrationControlPanelProps {
    availablePenetrations: IPenetrationData[],
    constants: AVConstants,
}

interface IPenetrationControlPanelState {
    activePenetration: IPenetrationData,
}

export class PenetrationControlPanel extends React.Component<IPenetrationControlPanelProps, IPenetrationControlPanelState> {
    constructor(props: IPenetrationControlPanelProps) {
        super(props);

        this.state = {
            activePenetration: this.props.availablePenetrations.length > 0 ? this.props.availablePenetrations[0] : null,
        };
    }

    private handleChange(e: React.SyntheticEvent, data: DropdownProps) {
        const selectedPenetration = data.value as string;
        const idx = this.props.availablePenetrations.map(pen => pen.penetrationId).indexOf(selectedPenetration);
        this.setState({ activePenetration: this.props.availablePenetrations[idx] });
    }

    public componentDidUpdate(_prevProps: Readonly<IPenetrationControlPanelProps>, prevState: Readonly<IPenetrationControlPanelState>) {
        if (prevState.activePenetration === null && this.props.availablePenetrations.length > 0) {
            this.setState({activePenetration: this.props.availablePenetrations[0]});
        }
    }

    public render() {
        const penetrationOptions = this.props.availablePenetrations.map(pen => ({
            key: pen.penetrationId,
            value: pen.penetrationId,
            text: pen.penetrationId,
        }));

        let controls = null;

        if (this.state.activePenetration !== null) {
            const editDropdown = (
                <Dropdown defaultValue={this.state.activePenetration.penetrationId}
                          search
                          selection
                          options={penetrationOptions}
                          onChange={this.handleChange.bind(this)}
                />
            );
    
            const penetrationControlProps: IPenetrationControlsProps = {
                penetration: this.state.activePenetration,
                constants: this.props.constants,
            }
    
            const penetrationControls = <PenetrationControls {...penetrationControlProps}/>;
            controls = (<Grid>
                <Grid.Column width={4}>
                    <p>Select a penetration to edit</p>
                    {editDropdown}</Grid.Column>
                <Grid.Column width={12}>{penetrationControls}</Grid.Column>
            </Grid>);
        }

        

        return (
            <Container>
                <Header as='h2'>Penetration controls</Header>
                {controls}
            </Container>
        );
    }
}
