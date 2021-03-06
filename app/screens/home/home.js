import React, { Component } from 'react'
import { View, StyleSheet, AsyncStorage, TouchableHighlight, Text, Alert, Linking } from 'react-native'
import moment from 'moment'
import PopupDialog from 'react-native-popup-dialog'
import UserInfoService from './../../services/userInfoService'
import Transactions from './transactions'
import Auth from './../../util/auth'
import ResetNavigation from './../../util/resetNavigation'
import Colors from './../../config/colors'
import ReexService from '../../services/reexService'
import Header from './../../components/header'
import Constants from './../../config/constants'
import Spinner from 'react-native-loading-spinner-overlay'

export default class Home extends Component {
    static navigationOptions = {
        label: 'Home',
    }

    constructor(props) {
        super(props)
        this.state = {
            balance: 0,
            reexBtcPriceBalance: 0,
            reexUsdBalance: 0,
            showTransaction: false,
            symbol: '',
            dataToShow: {
                currency: {},
            },
            reference: '',
            creditSwitch: true,
            debitSwitch: true,
            loading: false,
            loadingMessage: '',
        }
    }

    async componentWillMount() {
        try {
            const token = await AsyncStorage.getItem('token')
            if (token === null) {
                this.logout()
            }
            return token
        }
        catch (error) {
        }
    }

    async componentDidMount() {
        await this.getUserInfo()
        await this.getInitialisedWallet()
        await this.getBalanceInfo()
    }

    setBalance = (balance, divisibility) => {
        return balance
    }

    getUserInfo = async () => {
        const token = await AsyncStorage.getItem('token')
        
        if(token !== null) {
            let responseJson = await UserInfoService.getUserDetails()
            if (responseJson.status === "success") {
                await AsyncStorage.removeItem('user')
                await AsyncStorage.setItem('user', JSON.stringify(responseJson.data))
            }
            else {
                await this.logout()
            }
        }
    }

    getBalanceInfo = async () => {
        let user = JSON.parse(await AsyncStorage.getItem('user'))
        if (user === null || !user.isVerified) {
            return
        }
        else {
            let wallet = JSON.parse(await AsyncStorage.getItem('wallet'))
            if (wallet !== null) {
                let responseJson = await ReexService.getBalance(wallet.walletId, wallet.email)
                if (responseJson.status === "success") {
                    AsyncStorage.setItem('currency', JSON.stringify(responseJson))
                    this.setState({symbol: responseJson.symbol})
                    this.setState({balance: responseJson.available_balance})
                    this.setState({reexBtcPriceBalance: responseJson.reexBtcPrice})
                    this.setState({reexUsdBalance: responseJson.reexUsdPrice})
                }
                else {
                    this.logout()
                }
            }
        }        
    }

    getInitialisedWallet = async () => {
        let wallet = JSON.parse(await AsyncStorage.getItem('wallet'))
        let user = JSON.parse(await AsyncStorage.getItem('user'))
        if (user === null || !user.isVerified) {
            return
        }
        else if (wallet === null) {
            let reexWallet = await ReexService.getWallet(user.id, user.email)
            if (reexWallet.status === 'error') {
                this.setState({ loading: true, loadingMessage: 'Wallet initialising...' })
                let newWallet = await ReexService.createWallet(user.id, user.email)
                if (newWallet.status === 200) {
                    let createdWallet = await ReexService.getWallet(user.id, user.email)
                    if (createdWallet.status === 'success') {
                        await AsyncStorage.removeItem('wallet')
                        await AsyncStorage.setItem('wallet', JSON.stringify(createdWallet))
                    }

                    Alert.alert('Success',
                        "Your new wallet was successfully created!",
                        [{ text: 'OK', onPress: () => { 
                            ResetNavigation.dispatchToSingleRoute(this.props.navigation, "Home") 
                        }}])
                }
                else {
                    await AsyncStorage.removeItem('wallet')
                    Alert.alert('Error',
                        "An error occured while trying to create your wallet!",
                        [{ text: 'OK', onPress: () => { 
                            ResetNavigation.dispatchToSingleRoute(this.props.navigation, "Home")
                        }}])
                }
                this.setState({ loading: false, loadingMessage: '' })
            }
            else {
                await AsyncStorage.removeItem('wallet')
                await AsyncStorage.setItem('wallet', JSON.stringify(reexWallet))
            }            
        }
    }

    logout = () => {
        Auth.logout(this.props.navigation)
    }

    showDialog = (item) => {
        this.setState({ dataToShow: item });
        this.popupDialog.show()
    }

    getAmount = (amount = 0, divisibility) => {
        return amount.toFixed(8).replace(/\.?0+$/, "")
    }

    openLink = (txid) => {
        Linking.canOpenURL(`${Constants.reex_explorer}${txid}`).then(supported => {
          if (supported) {
            Linking.openURL(`${Constants.reex_explorer}${txid}`)
          }
          else {
            Alert.alert('Error',
              'Don\'t know how to open URI: ' + `${Constants.reex_explorer}${txid}`,
              [{ text: 'OK' }])
          }
        })
    }

    render() {
        /*let swipeBtns = [{
            text: 'Show',
            backgroundColor: Colors.lightgray,
            underlayColor: 'rgba(0, 0, 0, 1, 0.6)',
            onPress: () => this.props.navigation.navigate(
                'AccountCurrencies',
                {reference: this.state.reference}
            )
        }];*/
        return (
            <View style={styles.container}>
                <Spinner
                    visible={this.state.loading}
                    textContent={this.state.loadingMessage}
                    textStyle={{color: '#FFF'}}
                />
                <Header
                    navigation={this.props.navigation}
                    drawer
                    creditSwitch={this.state.creditSwitch}
                    debitSwitch={this.state.debitSwitch}
                />
                <View style={styles.balance}>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={{ fontSize: 20, color: 'white' }}>
                            {this.state.symbol}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={{ paddingLeft: 5, fontSize: 35, color: 'white' }}>
                            {this.state.balance.toFixed(4).replace(/0{0,2}$/, "")}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={{ paddingLeft: 5, fontSize: 15, color: 'white' }}>
                            {this.state.reexBtcPriceBalance > 1 ? this.state.reexBtcPriceBalance.toFixed(4).replace(/0{0,2}$/, "") : this.state.reexBtcPriceBalance.toFixed(8).replace(/0{0,6}$/, "")} BTC / $ {this.state.reexUsdBalance.toFixed(4).replace(/0{0,2}$/, "")}
                        </Text>
                    </View>
                </View>
                <View style={styles.transaction}>
                    <Transactions updateBalance={this.getBalanceInfo} showDialog={this.showDialog}
                        logout={this.logout} navigation={this.props.navigation} />
                </View>
                <View style={styles.buttonbar}>
                    <TouchableHighlight
                        style={styles.submit}
                        onPress={() => this.props.navigation.navigate("Receive")}>
                        <Text style={{ color: 'white', fontSize: 20 }}>
                            Receive
                        </Text>
                    </TouchableHighlight>
                    <TouchableHighlight
                        style={[styles.submit, { marginLeft: 25 }]}
                        onPress={() => this.props.navigation.navigate("SendTo")}>

                        <Text style={{ color: 'white', fontSize: 20 }}>
                            Send
                        </Text>
                    </TouchableHighlight>
                </View>
                <PopupDialog
                    ref={(popupDialog) => {
                        this.popupDialog = popupDialog;
                    }}
                    height={250}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flex: 3, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <View style={{ flex: 3, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                            <Text style={{ fontSize: 20, color: Colors.black }}>
                                {"Type: " + this.state.dataToShow.category}
                            </Text>
                            <Text style={{ fontSize: 20, color: Colors.black }}>
                                {this.getAmount(this.state.dataToShow.amount, false) + " REEX"}
                            </Text>
                            <Text style={{ fontSize: 20, color: Colors.black }}>
                                {"Transaction Id:"}
                            </Text>
                        </View>
                            <View style={styles.boxed}>
                                <View style={styles.memoIcon}>
                                    <Text style={[styles.memoText, {fontSize: 10}]}>
                                        {this.state.dataToShow.txid}
                                    </Text>
                                    {/* <TouchableHighlight
                                        underlayColor={'white'}
                                        onPress={this.openLink(this.state.dataToShow.txid)}>
                                    </TouchableHighlight> */}
                                </View>
                            </View>
                        </View>
                        <View style={{
                            flex: 1,
                            flexDirection: 'row',
                            borderTopColor: Colors.lightgray,
                            borderTopWidth: 1,
                            paddingLeft: 20,
                            paddingRight: 20
                        }}>
                            <View style={{ flex: 2, justifyContent: 'center' }}>
                                <Text style={{ fontSize: 15, alignSelf: "flex-start", color: Colors.black }}>
                                    {moment((new Date(this.state.dataToShow.timereceived*1000))).format('lll')}
                                </Text>
                            </View>
                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                <Text style={{ fontSize: 15, alignSelf: "flex-end", color: Colors.black }}>
                                    {"Confirmations: " + this.state.dataToShow.confirmations}
                                </Text>
                            </View>
                        </View>
                    </View>
                </PopupDialog>
            </View>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: 'white',
    },
    boxed: {
        flexDirection: 'column',
        padding: 5,
        backgroundColor: Colors.lightgray,
    },
    balance: {
        flex: 1,
        backgroundColor: Colors.blue,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    transaction: {
        flex: 5,
        backgroundColor: Colors.lightgray,
    },
    buttonbar: {
        position: 'absolute',
        bottom: 0,
        flexDirection: 'row',
        paddingHorizontal: 25,
        justifyContent: 'center',
        paddingVertical: 10,
        backgroundColor: 'transparent',
    },
    floatView: {
        position: 'absolute',
        width: 100,
        height: 100,
        top: 200,
        left: 40,
        backgroundColor: 'blue',
    },
    submit: {
        backgroundColor: Colors.blue,
        height: 50,
        borderRadius: 25,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
})

