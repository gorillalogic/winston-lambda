const { google } = require('googleapis');

const calendarId = '6i7h19gftsao0fl18nibeukts8@group.calendar.google.com'; // TODO: Move to env variable

const serviceAccount = {
  type: 'service_account',
  project_id: 'winston-2d06e',
  private_key_id: 'c34bced7e2e96c08b067de38f1fd418eee4c5aa6',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDLoqVrN4RRB6y/\nd5mrovpsI7Kcx4SKN6gwZ0ohcBTim+p7f5Qz3e09/UcMY0fecNZy9zGzpadj3FkW\nYkZRufEdDZ8JbxaT1TYepioQMQecXC1B53hXURfzhbBlR9iaYmz6A2Cnu7jC24zF\ncNOKBFqhUgECxokJASwZ32S+V2eB32B+Mz6Mk6gx0/9ASOKtmlV6myPQlIOn1oug\nx9Y+m15QDL0wf0CwgR957vRkZOGibdAqVzCHoKOsKO1i5A8ktehrK6Htp4yT/sCT\nlk4Ocw+mP2TJ5d2mf3C8sXfRZ0lOP9HGvhTuY4ohjB7J4uIiDo2CDN71RhoGVv6I\n/Ii1iIYLAgMBAAECggEAF5u9rdZ74qEPKAuHp1x3x/3DgWWoOhYFy8bN016ZLUSC\nRNsfpXu/O4aXrBn+hQ1z71Q1UOyNoYg0U+IE4Qi7qXCg1Ykphu4bHiaJjeMBTOFq\n5c8eJpFiQ3tmXfecZxmuJLYriIa8/upRQbq467FhiH5nW5kE3iRipoU9usuLVoUI\nDMsEtZLey5xHteYdgRMu3dmSSofvFs6cPWYlcxkl6sY6FGY4aLlxGuURXVHwz7OV\nnVN1DY7TmqnzyaPPiBY9X9Of24Ieoalx8He5hCE3MyVp+pNbD8W7IrVAUQ8OI8WT\nB4O2FnEGtqDbLLElr/MJc+ZSVHPQlqZ5Ec0csWPPUQKBgQD7bmoWa585BC77oY1o\nu+Bt5no23yEezPLt3WGCradFMhXeGuaxX7KyaAQoyrLc5ysvsskv/tScvcmC9bIQ\nsARD5kIRISsExJaoRrOzgrkFLNQuPrwTY0w6EDDkSUy7Cr6zLl4avhrIj/6luLf0\n/WHZcK85nU80Gz5eN+GCbpzsNQKBgQDPVeYVCdsEbCSIGF7F6mziWucrvl1N2fSy\nc1T6xtegf5oeioA0yMI8IuSFCLQroBceUEzCcADAU98HpvVxFUhnVJAWYymkDWY4\nt0yaR/qek63Ar4G9wg+85GtzLQTRJnh3k10GlR+t1ggOErTrn7KEzG/3mJU4c2Hz\nqgyWVOtxPwKBgFK+w6sdQAlDlzK4uBD/w5xnfVERnZTFXi1p7e1TuPjMwuWVdNZq\n6CROlw/VpYeNjGjmLc/dzZrH2sl+kltrkfvGi3eXstCe4fX/TqSFIN7TIgEWJE89\nHpj9OxnmBZqIrrnJSK8EYUwgF23ynJfDy7ADpacQXkCHtr7LJSwHux0BAoGANVoF\nOqSulxS80chzmroYCqcZlUgG+mF7de/3jhBcrBApuHIrS2ndkVvpMdJrik5HpKVF\nG0N27gam/XEY92BioTRBX4Fk1bIc+7svGwQqmWOm8k43NH0bT5/3hkuvUaJ0nVBu\nP6Nf43uP1w85Puh5J3Lz3OKGg2AtdGXtl0GC1EECgYAPdtuhlLhCS9JW9f/IrvGo\n24s2nNxHzXywyTC5rfGApFxHngTNrVzYsLEFgMEvF5I8sQTd9pa7FBAdIS+rTvLU\nOZT4S+67n7Q8fHbMayiM3qVmNEw86iq8d4gj8npGAn1pYP9u4lsK0byoaxe5kki7\nCsc4Eg52IgiBEiJY7TTtFg==\n-----END PRIVATE KEY-----\n',
  client_email: 'wellness-activities@winston-2d06e.iam.gserviceaccount.com',
  client_id: '103934030182041620924',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/wellness-activities%40winston-2d06e.iam.gserviceaccount.com',
};

const serviceAccountAuth = new google.auth.JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: 'https://www.googleapis.com/auth/calendar',
});

module.exports = { calendarId, serviceAccount, serviceAccountAuth };
