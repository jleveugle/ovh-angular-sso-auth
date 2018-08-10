/**
 * @ngdoc service
 * @name ovh-angular-sso-auth.ssoAuthInterceptor
 * @module ovh-angular-sso-auth
 * @description
 * Authentication interceptor for SSO
 *
 */
export default /* @ngInject */ function ($q, ssoAuthentication) {
    "use strict";
    return {
        /**
         * @ngdoc function
         * @name request
         * @methodOf ovh-angular-sso-auth.ssoAuthInterceptor
         *
         * @description
         * Interceptors get called with a http config object
         *
         * @param {object} config configuration
         * @return {object} modified configuration
         */
        request: function (config) {
            var urlPrefix = ssoAuthentication.getUrlPrefix(config.serviceType);
            var isTemplate = new RegExp(/(?:(?:\.html)|(?:Messages\w+\.json))$/i).test(config.url);

            if (!isTemplate) {

                return ssoAuthentication.getSsoAuthPendingPromise().then(function () {

                    config.headers = angular.extend(angular.copy(ssoAuthentication.getHeaders()), config.headers);

                    // For no prefix if begins with http(s)://
                    if (urlPrefix && !/^http(?:s)?:\/\//.test(config.url)) {
                        config.url = urlPrefix + config.url;
                    }

                    if (config.timeout) {
                        var deferredObjTimeout = $q.defer();

                        // Can be cancelled by user
                        config.timeout.then(function () {
                            deferredObjTimeout.resolve();
                        });

                        // Cancelled when not logged [ONLY IF NOAUTHENTICATE IS UNDEFINED OR FALSE]
                        if (!config.noAuthenticate) {
                            ssoAuthentication.getRequestPromise().then(function () {
                                deferredObjTimeout.resolve();
                            });
                        }

                        config.timeout = deferredObjTimeout.promise;
                    } else if (!config.noAuthenticate) {
                        // Cancelled when not logged [ONLY IF NOAUTHENTICATE IS UNDEFINED OR FALSE]
                        config.timeout = ssoAuthentication.getRequestPromise();
                    }

                    return config;
                });
            }

            return config;

        },

        /**
         * @ngdoc function
         * @name responseError
         * @methodOf ovh-angular-sso-auth.ssoAuthInterceptor
         *
         * @description
         * Interceptor gets called when a previous interceptor threw an error or resolved with a rejection
         *
         * @param {object} response Response
         * @return {object} promise
         */
        responseError: function (response) {

            return ssoAuthentication.isLogged().then(function (logged) {

                if (response.status === 403 && (response.data.message === "This session is forbidden" || response.data.message === "This session is invalid")) {
                    response.status = 401;
                }

                // Redirect on 401
                if (response.status === 401 && !response.config.preventLogout) {
                    ssoAuthentication.logout();
                    return $q.reject(response);
                }

                // If CODE 471 AKA Low-order session
                if (response.status === 471) {
                    ssoAuthentication.goToLoginPage();
                    return $q.reject(response);
                }

                // Force logout
                if ((!response.config || !response.config.noAuthenticate) && !logged) {
                    ssoAuthentication.logout();
                    return $q.reject(response);
                }

                // Reject the response
                return $q.reject(response);
            });

        }
    };
};
