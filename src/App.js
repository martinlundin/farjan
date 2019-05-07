import React, {Component} from 'react';
import axios from "axios"
import './assets/css/style.scss';
import HarborFilter from './components/HarborFilter'


class App extends Component {

    /**
     * Api documentation: http://api.trafikinfo.trafikverket.se/API/TheRequest
     */

    api = (query) => {
        return axios({
            method: "post",
            url: "https://api.trafikinfo.trafikverket.se/v1.3/data.json",
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                REQUEST: {
                    LOGIN: {
                        authenticationkey: "e0b09c15958e47faaa74fd30c908bb12"
                    },
                    QUERY: [query]
                }
            })
        }).then(response => {
            return response

        }).catch(error => {
            throw error.response.data.RESPONSE.RESULT[0].ERROR.MESSAGE
        });
    };

    getFerryRoutes = () => {
        let query = {
            objecttype: "FerryRoute"
        };

        return this.api(query).then(response => {
            return response.data.RESPONSE.RESULT[0].FerryRoute
        })
    };
    getDeviations = (ids, timeDiff = "-0.00:01:00") => {
        let query = {
            objecttype: "Situation",
            FILTER: {
                ELEMENTMATCH: [{
                    OR: [{
                        EQ: ids.map(function (id) {
                            return {
                                name: "Deviation.Id",
                                value: id
                            }
                        })
                    }],
                    NE: [{
                        name: "Deviation.IconId",
                        value: "ferryDepartureOnSchedule"
                    }],
                    LT: [{
                        name: "Deviation.StartTime",
                        value: "$dateadd(" + timeDiff + ")"
                    }],
                    GT: [{
                        name: "Deviation.EndTime",
                        value: "$dateadd(" + timeDiff + ")"
                    }]
                }]
            },
            DISTINCT: "Deviation"
        };

        return this.api(query).then(response => {
            //If there are any Deviations, return them, otherwise return empty array
            if (response.data.RESPONSE.RESULT[0].Situation[0].hasOwnProperty("Deviation")) {
                //Note, because Trafikverkets API filter is broken for nested objects we need to filter here to ensure only ferry Deviations is returned
                return response.data.RESPONSE.RESULT[0].Situation[0].Deviation.filter(Deviation => {
                    return Deviation.MessageCodeValue === "ferry"
                });
            } else {
                return []
            }
        })
    };
    getDepartures = (routeId, timeDiff = "-0.00:01:00", limit = 10) => {
        let query = {
            objecttype: "FerryAnnouncement",
            limit: limit,
            orderby: "DepartureTime asc",
            FILTER: {
                AND: [
                    {
                        GT: [{
                            name: "DepartureTime",
                            value: "$dateadd(" + timeDiff + ")"
                        }],
                        EQ: [{
                            name: "Route.Id",
                            value: routeId,
                        }]
                    }
                ]
            },
            EXCLUDE: ["Route", "DeviationId", "ModifiedTime"]
        };

        return this.api(query).then(response => {
            return response.data.RESPONSE.RESULT[0].FerryAnnouncement
        })
    };

    constructor(props) {
        super(props);
        this.state = {
            isLoaded: false,
            search: "",
            filter: {},
            FerryRoute: null,
            FerryRoutes: [],
            FerryRoutesResults: [],
            Deviations: [],
            InfoMessages: [],
            Departures: [],
        };
    }

    componentDidMount() {
        this.getFerryRoutes().then(FerryRoutes => {

            console.log("Routes");
            console.log(FerryRoutes);
            this.setState({FerryRoutes});

            //Get Deviations for all the FerryRoutes
            this.getDeviations(FerryRoutes.map(Route => {
                return Route.DeviationId
            })).then(Deviations => {

                console.log("Deviations");
                console.log(Deviations);
                this.setState({Deviations});
            });
        });
    }

    filterFerryRoutes(search){
        return this.state.FerryRoutes.filter(FerryRoute => {
            if (search !== "") {
                if (FerryRoute.Name.toLowerCase().match(search.toLowerCase()) !== null) {
                    return FerryRoute
                } else if (FerryRoute.Harbor[0].Name.toLowerCase().match(search.toLowerCase()) !== null || FerryRoute.Harbor[1].Name.toLowerCase().match(search.toLowerCase()) !== null) {
                    return FerryRoute
                } else {
                    return null
                }
            } else {
                return null
            }
        });
    }

    sortRelevance(a,b,search){
        let x = a.Name.toLowerCase().match(search.toLowerCase());
        let y = b.Name.toLowerCase().match(search.toLowerCase());

        if(x !== null){
            if(y !== null){
                if (x.index < y.index) {return -1;}
                if (x.index > y.index) {return 1;}
            }
            return -1
        }
        if(y !== null) {
            return 1
        }
        return 0;
    }

    searchChangeHandler = event => {
        this.setState({
            search: event.target.value,
            filter: {},
            Departures: [],
            FerryRoute: null,
            FerryRoutesResults: this.filterFerryRoutes(event.target.value).sort((a,b) => {
                    return this.sortRelevance(a,b,event.target.value)
                }).slice(0, 8)
        });
    };

    chooseFerryRoute(FerryRoute) {
        //Set search states
        this.setState({
            search: FerryRoute.Name,
            FerryRoute: FerryRoute,
            FerryRoutesResults: [],
        });
        //Get departures and set its state
        this.getDepartures(FerryRoute.Id).then(Departures => {
            this.setState({Departures});
        });
    }

    addZero(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }

    showTime(time) {
        let unixTimestamp = Date.parse(time);
        let dateTime = new Date(unixTimestamp);
        let currentDateTime = new Date();
        let currentUnixTimestamp = Date.parse(currentDateTime);
        let diff = (unixTimestamp - currentUnixTimestamp) / 1000;

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

        if (diff <= 0 || diff <= 60) {
            //Diff is passed (1 minute margin by default) or less than 1 minute
            return "Nu"
        } else if (diff <= 3600) {
            return Math.ceil(diff / 60) + "min"
        } else if (dateTime.toDateString() === currentDateTime.toDateString()) {
            //If it is the same day, show only time, otherwise show all
            return this.addZero(dateTime.getHours()) + ":" + this.addZero(dateTime.getMinutes())
        } else {
            //Show time and date
            return dateTime.getDate() + " " + monthNames[dateTime.getMonth()] + " " + this.addZero(dateTime.getHours()) + ":" + this.addZero(dateTime.getMinutes())
        }
    }

    changeHarbor(Name) {
        let filter = {...this.state.filter};
        filter.FromHarbor = {Name};
        this.setState({filter});
    }

    render() {
        console.log(this.state)
        return (
            <div className="App">
                <header>
                    <div id={"searchWrap"}>
                        <input
                            onChange={this.searchChangeHandler}
                            value={this.state.search}
                            className={"searchInput"}
                            name={"search"}
                            placeholder={"Sök färja"}
                            autoComplete={"off"}
                        />
                        <ul className={"searchResults"}>
                            {this.state.FerryRoutesResults.map((FerryRoutesResult) => (
                                <li key={FerryRoutesResult.Id} onClick={() => {
                                    this.chooseFerryRoute(FerryRoutesResult)
                                }}>
                                    {FerryRoutesResult.Name}
                                </li>
                            ))}
                        </ul>
                    </div>
                </header>
                <main>
                    {(() => {

                        if (this.state.FerryRoute !== null) {
                            this.state.Deviations.map((Deviation) => {
                                if (Deviation.Id === this.state.FerryRoute.DeviationId) {
                                    return Deviation.Message
                                }
                            });
                            if (this.state.FerryRoute.Type.Id === 2) {
                                return <HarborFilter Harbors={this.state.FerryRoute.Harbor}
                                                     changeHarbor={this.changeHarbor.bind(this)}/>
                            }
                        }

                    })()}
                    <ul className={"Departures"}>
                        {this.state.Departures.map((Departure) => {
                            if(this.state.filter.hasOwnProperty("FromHarbor")){
                                if(Departure.FromHarbor.Name === this.state.filter.FromHarbor.Name){
                                    return (
                                        <li key={Departure.Id}>
                                            {this.showTime(Departure.DepartureTime)}
                                        </li>
                                    )
                                }
                            }else{
                                return (
                                    <li key={Departure.Id}>
                                        {this.showTime(Departure.DepartureTime)}
                                    </li>
                                )
                            }
                        })}
                    </ul>
                </main>
            </div>
        );
    }
}

export default App;
