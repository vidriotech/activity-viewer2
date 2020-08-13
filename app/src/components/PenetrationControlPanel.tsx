import React from 'react';

import { Dropdown, List, SemanticICONS, Container, Grid, DropdownProps, Header } from 'semantic-ui-react';

import { AVConstants } from '../constants';
import { IPenetration } from '../models/penetrationModel';
import { PenetrationControls, IPenetrationControlsProps } from './PenetrationControls';

export interface IPenetrationControlPanelProps {
    availablePenetrations: string[],
    constants: AVConstants,
}

interface IPenetrationControlPanelState {
    activePenetration: string,
}

export class PenetrationControlPanel extends React.Component<IPenetrationControlPanelProps, IPenetrationControlPanelState> {
    constructor(props: IPenetrationControlPanelProps) {
        super(props);

        this.state = {
            activePenetration: this.props.availablePenetrations[0],
        };
    }

    private handleChange(e: React.SyntheticEvent, data: DropdownProps) {
        const selectedPenetration = data.value as string;
        this.setState({ activePenetration: selectedPenetration });
    }

    public render() {
        const penetrationOptions = this.props.availablePenetrations.map(penetrationId => ({
            key: penetrationId,
            value: penetrationId,
            text: penetrationId,
        }));

        const editDropdown = (
            <Dropdown defaultValue={this.props.availablePenetrations[0]}
                      search
                      selection
                      options={penetrationOptions}
                      onChange={this.handleChange.bind(this)}
            />
        );

        const penetrationControlProps: IPenetrationControlsProps = {
            penetrationId: this.state.activePenetration,
            constants: this.props.constants,
        }

        const penetrationControls = <PenetrationControls {...penetrationControlProps}/>

        return (
            <Container>
                <Header as='h2'>Penetration controls</Header>
                <Grid>
                    <Grid.Column width={4}>
                        <p>Select a penetration to edit</p>
                        {editDropdown}</Grid.Column>
                    <Grid.Column width={6}>{penetrationControls}</Grid.Column>
                </Grid>
            </Container>
        )
    }
}
