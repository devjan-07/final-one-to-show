package com.voyara.tourguide.payments;

public record DemoPaymentRequest(
        String paymentMethod,
        String cardholderName,
        String cardNumber,
        String expiryMonth,
        String expiryYear,
        String cvv
) {}
