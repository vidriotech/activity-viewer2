import React from 'react';
import { Container, Header, List} from 'semantic-ui-react';

import { APIClient } from '../apiClient';
import { AVConstants } from '../constants';
import { IPenetrationTimeseriesResponse } from '../models/apiModels';

import { TimeseriesSelector, ITimeseriesSelectorProps } from './TimeseriesSelector';

export interface IPenetrationControlsProps {
    constants: AVConstants,
    penetrationId: string,
}

interface IPenetrationControlsState {
    timeseries: string[],
}

export class PenetrationControls extends React.Component<IPenetrationControlsProps, IPenetrationControlsState> {
    private apiClient: APIClient;

    constructor(props: IPenetrationControlsProps) {
        super(props);

        this.state = {
            timeseries: []
        };
        
        this.apiClient = new APIClient(this.props.constants.apiEndpoint);
    }

    private fetchTimeseries() {
        this.apiClient.fetchAllTimeseries(this.props.penetrationId)
            .then((res: any) => res.data)
            .then((res: IPenetrationTimeseriesResponse) => {
                this.setState({timeseries: res.timeseries});
            })
            .catch((err: any) => {
                console.error(err);
            });
    }

    public componentDidMount() {
        this.fetchTimeseries();
    }

    public render() {
        const timeseriesList = (
            <List>
                {this.state.timeseries.map(t => {
                    const timeseriesSelectorProps: ITimeseriesSelectorProps = {
                        timeseriesId: t,
                        penetrationId: this.props.penetrationId,
                        constants: this.props.constants,
                    };
                    return <List.Item key={t}>{<TimeseriesSelector {...timeseriesSelectorProps} />}</List.Item>
                })}
            </List>
        );

        return (
            <Container>
                {timeseriesList}
                {/* <TimeseriesSelector {...timeseriesSelectorProps} /> */}
            </Container>
        );
    }
}