import React from 'react';
import moment from "moment/moment";
import 'moment/locale/sv'
import ferry from './../assets/img/gulafarjan.png'

class DepartureComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            "Departure":   this.props.Departure,
        };
    }

    renderDate = (time) => {
        let unixTimestamp = moment(time).unix();
        let currentUnixTimestamp = moment().unix();
        let diff = unixTimestamp - currentUnixTimestamp;
        let displayMinutesBetween = [900, 3600];

        if(moment(time).format('LL') !== moment().format('LL')) {
            return moment(time).format('LL');
        }else if (diff > displayMinutesBetween[0] && diff < displayMinutesBetween[1]) {
            return moment(time).format('LT');
        }
    };

    renderTime = (time) => {
        let unixTimestamp = moment(time).unix();
        let currentUnixTimestamp = moment().unix();
        let diff = unixTimestamp - currentUnixTimestamp;

        //Diff is passed (1 minute margin by default) or less than 1 minute
        if (diff <= 60) {
            return "Nu"
        } else if (diff <= 3600) {
            return Math.ceil(diff / 60) + "min"
        }  else {
            return moment(time).format('LT');
        }
    };

    render() {
        return (
            <li>
                <div className={"ferryDepartureInfo"}>
                    <span className={"ferryIcon"}><img src={ferry} alt={"Gulafärjan ikon"}/></span>
                    <span className={"ferryFromTo"}>
                        <span className={"ferryFrom"}>{this.state.Departure.FromHarbor.Name}</span>
                        <i className="fas fa-arrow-right"></i>
                        <span className={"ferryTo"}>{this.state.Departure.ToHarbor.Name}</span>
                    </span>
                </div>
                <div className={"ferryDepartureDateTime"}>
                    <span className={"time"}>{this.renderTime(this.state.Departure.DepartureTime)}</span>
                    <span className={"date"}>{this.renderDate(this.state.Departure.DepartureTime)}</span>
                </div>
            </li>
        )
    }
}

export default DepartureComponent;