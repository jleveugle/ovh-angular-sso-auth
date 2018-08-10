/**
 * @ngdoc service
 * @name ovh-angular-sso-auth.ssoAuthenticationProvider
 * @module ovh-angular-sso-auth
 * @description
 * Authentication for SSO
 *
 */
export default function () {
    "use strict";

    var loginUrl = "https://www.ovh.com/auth";
    var logoutUrl = "https://www.ovh.com/auth?action=disconnect";
    var userUrl = "/engine/api/me";
    var rules = [];
    var urlPrefix = "";
    var ovhSubsidiary = null;

    /**
     * @ngdoc function
     * @name setLoginUrl
     * @methodOf ovh-angular-sso-auth.ssoAuthenticationProvider
     *
     * @description
     * Set url login page
     *
     * @param {string} _loginUrl url
     */
    this.setLoginUrl = function (_loginUrl) {
        loginUrl = _loginUrl;
    };

    /**
     * @ngdoc function
     * @name setLogoutUrl
     * @methodOf ovh-angular-sso-auth.ssoAuthenticationProvider
     *
     * @description
     * Set logout url
     *
     * @param {string} _logoutUrl url
     */
    this.setLogoutUrl = function (_logoutUrl) {
        logoutUrl = _logoutUrl;
    };

    /**
     * @ngdoc function
     * @name setUserUrl
     * @methodOf ovh-angular-sso-auth.ssoAuthenticationProvider
     *
     * @description
     * Set /me url
     *
     * @param {string} _userUrl url
     */
    this.setUserUrl = function (_userUrl) {
        userUrl = _userUrl;
    };

    /**
     * @ngdoc function
     * @name setConfig
     * @methodOf ovh-angular-sso-auth.ssoAuthenticationProvider
     *
     * @description
     * Set configuration rules
     *
     * @param {bool} _rules Configuration rules
     */
    this.setConfig = function (_rules) {
        rules = _rules;
    };

    /**
     * @ngdoc function
     * @name setOvhSubsidiary
     * @methodOf ovh-angular-sso-auth.ssoAuthenticationProvider
     *
     * @description
     * Set OVH subsidiary country code
     * When setted ovh.com/auth will use the new login/registration form based on the API
     *
     * @param {string} _ovhSubsidiary OVH subsidiary country code
     */
    this.setOvhSubsidiary = function (_ovhSubsidiary) {
        ovhSubsidiary = _ovhSubsidiary;
    };

    // ---

    /**
     * @ngdoc service
     * @name ovh-angular-sso-auth.ssoAuthentication

     * @description
     * Authentication for SSO
     */
    var Authentication = function ($q, $timeout, $location, $window, $cookies) {

        var isLogged = false;
        var headers = {
            "Content-Type": "application/json;charset=utf-8",
            Accept: "application/json"
        };

        var deferredObj = {
            login: $q.defer(),
            logout: undefined,
            loginPage: undefined
        };

        this.userId = undefined;   // from cookie "USERID"
        this.user = {};            // from API /me

        // ---

        /**
         * @ngdoc function
         * @name getLoginUrl
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Get login page url
         */
        this.getLoginUrl = function () {
            return loginUrl;
        };

        /**
         * @ngdoc function
         * @name getLogoutUrl
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Get logout url
         */
        this.getLogoutUrl = function () {
            return logoutUrl;
        };

        /**
         * @ngdoc function
         * @name getUserUrl
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Get user informations url (/me)
         */
        this.getUserUrl = function () {
            return userUrl;
        };

        /**
         * @ngdoc function
         * @name getUrlPrefix
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Get url prefix for serviceType
         */
        this.getUrlPrefix = function (serviceType) {
            if (!rules || !Array.isArray(rules) || !rules.length) {
                return urlPrefix;
            }

            if (serviceType) {
                var i = 0;
                var rule = null;
                while (i < rules.length && rules[i].serviceType !== serviceType) {
                    i++;
                }
                rule = rules[i];

                if (rule && rule.hasOwnProperty("urlPrefix")) {
                    // Got it
                    return rule.urlPrefix;
                }

                    // serviceType unknown: return the default urlPrefix
                return urlPrefix;

            }

                // No serviceType: return the first rule urlPrefix
            return rules[0].urlPrefix;

        };

        // ---

        /**
         * @ngdoc function
         * @name isLogged
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Get login status
         */
        this.isLogged = function () {
            return deferredObj.login.promise.then(function () {
                return isLogged;
            });
        };

        /**
         * @ngdoc function
         * @name getRequestPromise
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Get request promise
         */
        this.getRequestPromise = function () {
            return this.isLogged().then(function (logged) {
                if (!logged) {
                    // user not logged in: cancel the request
                    return $q.when(true);
                }

                    // else, timeout the request after 1800 secs
                return $timeout(function () {
                    return true;
                }, 1800000);

            });
        };

        // ---

        // /!\ For testing purpose only
        this.setIsLoggedIn = function () {
            isLogged = true;
            deferredObj.login.resolve();
        };

        // ---

        /**
         * @ngdoc function
         * @name sessionCheckOrGoLogin
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Check session and logout if not logged
         */
        this.sessionCheckOrGoLogin = function () {
            var self = this;
            return this.isLogged().then(function (logged) {
                if (!logged) {
                    return self.goToLoginPage();
                }
            });
        };

        // ---

        /**
         * @ngdoc function
         * @name getHeaders
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Get headers
         */
        this.getHeaders = function () {
            return headers;
        };

        /**
         * @ngdoc function
         * @name getUserIdCookie
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Get USERID cookie
         */
        this.getUserIdCookie = function () {
            return typeof $cookies.get === "function" ? $cookies.get("USERID") : $cookies.USERID;
        };

        /**
         * @ngdoc function
         * @name login
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Perform login (need to be done at the app init)
         */
        this.login = function () {
            var self = this;

            // use jQuery ajax for checking if SESSION cookie setted
            $.ajax({
                url: self.getUserUrl(),
                method: "GET",
                headers: headers
            }).done(function (data) {
                self.user = data;                       // store user infos
                isLogged = true;
            }).fail(function () {
                isLogged = false;
            }).always(function () {
                self.userId = self.getUserIdCookie();   // store USERID
                deferredObj.login.resolve();
            });

            return deferredObj.login.promise;
        };

        /**
         * @ngdoc function
         * @name handleSwitchSession
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Handle the session modified
         */
        this.handleSwitchSession = function () {
            // By default, reload the page
            $window.location.reload();

            // Let requests in pending state (to prevent errors shown)
            return $q.defer().promise;
        };

        /**
         * @ngdoc function
         * @name getSsoAuthPendingPromise
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Get pending login promise
         */
        this.getSsoAuthPendingPromise = function () {
            var self = this;

            return deferredObj.login.promise.then(function () {
                var currentUserId = self.getUserIdCookie();
                if (self.userId !== currentUserId) {
                    return self.handleSwitchSession(currentUserId);
                }
            });
        };

        /**
         * @ngdoc function
         * @name logout
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Perform logout
         */
        this.logout = function (url) {
            if (!deferredObj.logout) {
                deferredObj.logout = $q.defer();
                isLogged = false;

                // redirect to logout page
                $timeout(function () {
                    $window.location.assign(logoutUrl + (logoutUrl.indexOf("onsuccess") > -1 ? "" : (logoutUrl.indexOf("?") > -1 ? "&" : "?") + "onsuccess=" + encodeURIComponent(url || $location.absUrl())));
                }, 0);
            }
            return deferredObj.logout.promise;
        };

        /**
         * @ngdoc function
         * @name goToLoginPage
         * @methodOf ovh-angular-sso-auth.ssoAuthentication
         *
         * @description
         * Redirect to login page
         */
        this.goToLoginPage = function (url) {
            if (!deferredObj.loginPage) {
                deferredObj.loginPage = $q.defer();

                // redirect to login page
                $timeout(function () {
                    var params = [];

                    if (ovhSubsidiary) {
                        params.push("ovhSubsidiary=" + ovhSubsidiary);
                    }

                    if (loginUrl.indexOf("onsuccess") === -1) {
                        params.push("onsuccess=" + encodeURIComponent(url || $location.absUrl()));
                    }

                    $window.location.assign(loginUrl + (loginUrl.indexOf("?") > -1 ? "&" : "?") + params.join("&"));
                }, 0);
            }
            return deferredObj.loginPage.promise;
        };
    };

    this.$get = /* @ngInject */ function ($q, $timeout, $location, $window, $cookies) {
        return new Authentication($q, $timeout, $location, $window, $cookies);
    };
};
