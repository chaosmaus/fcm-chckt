
$(document).ready(() => {
    let guestyId = localStorage.getItem('currentId');
    let inputData = {
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    };
    let paymentProviderId;

    document.querySelector('#firstName').addEventListener('input', (event) => {
        inputData.firstName = event.target.value;
    });

    document.querySelector('#lastName').addEventListener('input', (event) => {
        inputData.lastName = event.target.value;
    });

    document.querySelector('#email').addEventListener('input', (event) => {
        inputData.email = event.target.value;
    });

    document.querySelector('#phone').addEventListener('input', (event) => {
        inputData.phone = event.target.value;
    });



    function splitData(data) {
        data = data.split(' - ');
        return parsedDates = { checkin: data[0], checkout: data[1] }
    }

    function dateParser(start, end) {

        let startDate = new Date(start.split('-').join(','));
        let endDate = new Date(end.split('-').join(','));

        let diffInMilliseconds = endDate - startDate;
        let diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

        let options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        let formattedStartDate = startDate.toLocaleDateString("en-US", options);
        let formattedEndDate = endDate.toLocaleDateString("en-US", options);

        return {
            checkin: formattedStartDate,
            checkout: formattedEndDate,
            nights: diffInDays
        };
    }



    function parseData() {
        let parsedDates;
        let dates = localStorage.getItem('bookDates');
        if (!dates) {
            window.location.href = "/book-now";
        }
        let totalGuest = localStorage.getItem('guestsNumber');
        let propertyName = localStorage.getItem('currentName');
        let guestyId = localStorage.getItem('currentId');


        $('.thumbnail-guesty').each((index, element) => {

            if (guestyId === $(element).text()) {
                let src = $(element).siblings('.thumbnail-image').attr('src')
                $('.checkout_thumbnail').attr('src', src)
                $('.checkout_thumbnail').attr('srcset', src)
                $('.checkout_success_img').attr('src', src)
                $('.checkout_success_img').attr('srcet', src)
            }
        })

        $('.pdp-guesty').each((index, element) => {

            if (guestyId === $(element).text()) {
                $('.checkout_back-button').attr('href', $(element).siblings('.pdp-link').attr('href'))
            }
        })


        console.log('propertyName: ', propertyName)
        console.log('guestyId: ', guestyId)
        if (Number(totalGuest) < 1) totalGuest = 1;
        if (dates.length > 0 && dates != null && dates !== `Check-in - Check-out`) {
            parsedDates = splitData(dates);
        }
        return {
            checkin: parsedDates.checkin,
            checkout: parsedDates.checkout,
            guests: totalGuest,
            propertyName,
            guestyId
        }
    }

    /* OPEN API PAYMENT INFO */
    function getPaymentProvider() {
        return axios.get(`https://host-made-server.herokuapp.com/frenchcowboys/v2/reservation/payment-processor/${guestyId}`, {
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then(function (response) {
                console.log('response: ', response.data.response._id);
                return response.data.response._id;
            })
            .catch(function (error) {
                console.error(error);
                throw error; // Rethrow the error to handle it in the calling function
            });
    }
    async function renderForm(amount) {
        paymentProviderId = await getPaymentProvider();

        const options = {
            containerId: 'guesty-tokenization-container',
            providerId: paymentProviderId, // Replace with your actual payment provider ID
            amount: amount, // Set the appropriate amount
            currency: 'USD', // Set the appropriate currency
            onStatusChange: (isValid) => {
                // Handle the form validity change
                if (isValid && $('input[type="checkbox"]').is(":checked")) {
                    console.log('Form is valid');
                    $(".checkout-button").removeClass("unactive");
                } else {
                    console.log('Form is invalid');
                    if (!($(".checkout-button").hasClass("unactive"))) $(".checkout-button").addClass("unactive");
                }
            }
        };

        window.guestyTokenization.render(options)
            .then(() => {
                console.log('Tokenization form loaded successfully');
            })
            .catch(error => {
                console.error('Failed to load the tokenization form:', error);
            });

    }



    const checkoutController = () => {

        let data = parseData();
        console.log(data)
        let parsedDate = dateParser(data.checkin, data.checkout);
        $('.checkout_parsed-checkin').text(parsedDate.checkin);
        $('.checkout_parsed-checkout').text(parsedDate.checkout);
        $('.checkout-nights').text(parsedDate.nights);

        //https://host-made-server.herokuapp.com
        $('.checkout_results-heading').text(data.propertyName)
        $('.guests-amount').text(data.guests)
        const options = {
            method: "GET",
            url: `https://host-made-server.herokuapp.com/frenchcowboys/reservation/quote?listingid=${data.guestyId}&checkin=${data.checkin}&checkout=${data.checkout}&guests=${data.guests}`,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        };

        axios
            .request(options)
            .then(function (response) {
                let apiResponse = response.data.response.money.invoiceItems;
                console.log(response.data.response)
                let preTotal = 0;
                let tax = 0;
                let serviceFee = 0;
                let cleaningFee = 0;
                let total = 0;
                let additionalFees = 0;

                total = response.data.response.money.balanceDue;
                console.log('additional fee: ',response.data.response.money.invoiceItems )
                apiResponse.forEach((element, index) => {
                    
                    if (element.title === "Accommodation fare") {
                        preTotal = element.amount
                    } else if (element.title === "Cleaning fee") {
                        cleaningFee = element.amount
                    } else if (element.title === "Service Fee") {
                        serviceFee = serviceFee + element.amount
                    } else if (element.title === "Service") {
                        serviceFee = serviceFee + element.amount
                    } else if (element.title === "CITY_TAX") {
                        tax = tax + element.amount
                    } else if (element.title === "LOCAL_TAX") {
                        tax = tax + element.amount
                    } else if (element.title === "STATE_TAX") {
                        tax = tax + element.amount
                    } else {
                        additionalFees = additionalFees + element.amount
                        
                    }
                });

                let formattedTotal = new Intl.NumberFormat('en-US').format(Math.round(total))
                let formattedpreTotal = new Intl.NumberFormat('en-US').format(Math.round(preTotal))
                let formattedpreTax = new Intl.NumberFormat('en-US').format(Math.round(tax))
                let formattedpreServiceFee = new Intl.NumberFormat('en-US').format(Math.round(serviceFee))
                let formattedpreCleaningFee = new Intl.NumberFormat('en-US').format(Math.round(cleaningFee))
                let formattedAdditionalFees = new Intl.NumberFormat('en-US').format(Math.round(additionalFees))
                $('.checkout_total-pre-fees').text(formattedpreTotal);
                $('.checkout-tax').text(formattedpreTax);
                $('.checkout-service-fees').text(formattedpreServiceFee);
                $('.checkout-cleaning-fees').text(formattedpreCleaningFee);
                $('.checkout-additional-fees').text(formattedAdditionalFees);

                $('.checkout-total').text(formattedTotal);

                renderForm(total)

                if (tax === 0) $('.checkout-tax').parent().parent().remove()

                $('.checkout-button').on('click', (e) => {
                    let allValid = true;
                    let clickedButton = $(e.target)
                    let form = $('.checkout_form');
                    if (!form[0].checkValidity()) {
                        form[0].reportValidity();
                        return;
                    }


                    if (!(clickedButton.hasClass('unactive')) && form[0].checkValidity()) {

                        $('.checkout--loading-mask').show()
                        $('.checkout_success-heading').text('Booking Successful!');
                        $('.checkout_success_title').text(data.propertyName);
                        $('.checkout_parsed-checkin_success').text(parsedDate.checkin);
                        $('.checkout_parsed-checkout_success').text(parsedDate.checkout);
                        $('.checkout-total_success').text(total);

                        let reservationData = {
                            listingId: data.guestyId,
                            checkInDateLocalized: data.checkin,
                            checkOutDateLocalized: data.checkout,
                            guestsCount: data.guests,
                            firstName: inputData.firstName,
                            lastName: inputData.lastName,
                            email: inputData.email,
                            phone: inputData.phone,
                            token: 'pm_1KTRn22eZvKYlo2CkHIARaGo'

                        };

                        let paymentId;
                        window.guestyTokenization.submit()
                            .then((result) => {
                                console.log(' getting paymentId: ', result)
                                paymentId = result._id
                            }).catch((err) => {
                                console.log(err)
                            });

                        console.log(reservationData)
                        axios.post('https://host-made-server.herokuapp.com/frenchcowboys/reservation', reservationData)
                            .then((response) => {
                               
                                if (response.data.status === 200) {
                                    console.log('successfully created reservation');
                                    console.log(response.data);
                                    console.log(response.data.data._id);
                                    $('.checkout-success_mask').removeClass('hidden');
                                    let reservationId = response.data.data._id

                                    let paymentUpdateData = {
                                        reservationId,
                                        paymentId: paymentId,
                                        paymentProviderId,
                                        guestId: 'empty'
                                    }
                                    console.log('payment update data: ', paymentUpdateData)
                                    $('.checkout--loading-mask').hide()

                                    /* CREATING USER  https://host-made-server.herokuapp.com */
                                    axios.post('https://host-made-server.herokuapp.com/frenchcowboys/v2/user', inputData)
                                        .then((response) => {
                                            console.log('success creating user')

                                            /* GETTING RESERVATION */
                                            const reservationOption = {
                                                method: "GET",
                                                url: `https://host-made-server.herokuapp.com/frenchcowboys/v2/reservation/${reservationId}`,
                                                headers: {
                                                    "Content-Type": "application/json",
                                                    "Access-Control-Allow-Origin": "*",
                                                },
                                            };


                                            axios
                                                .request(reservationOption)
                                                .then(function (result) {
                                                    console.log('guestId', result.data.response.guestId)//.response.money.guest._id
                                                    paymentUpdateData.guestId = result.data.response.guestId;


                                                    /* UPDATING PAYMENT METHOD */
                                                    axios.post('https://host-made-server.herokuapp.com/frenchcowboys/v2/reservation/payment', paymentUpdateData)
                                                        .then((response) => {
                                                            console.log('success updating payment')
                                                            
                                                            console.log(response)
                                                        })
                                                        .catch(error => {
                                                            console.log('error updating payment')
                                                            console.log(error)
                                                        })


                                                })
                                                .catch(error => {
                                                    console.log('error getting reservation')
                                                    console.log(error)
                                                })




                                        })
                                        .catch(error => {
                                            console.log('error creating user')
                                            console.log(error)
                                        })






                                }
                            })
                            .catch((error) => {
                                console.log(error);
                            });



                    }
                })



            })
            .catch(function (error) {
                console.error(error);
            });

    }

    $('input[type="checkbox"]').on('change', function (e) {
        if ($(e.target).is(":checked")) {
            $(".checkout-button").removeClass("unactive");
        } else {
            $(".checkout-button").addClass("unactive");
        }
    });



    checkoutController();


})
