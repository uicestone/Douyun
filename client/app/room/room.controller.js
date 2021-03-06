(function () {
    'use strict';

    angular.module('app.room')
    .controller('roomStatusCtrl', ['$scope', '$route', 'roomService', 'clientService', 'socketIoService', roomStatusCtrl]);

    function roomStatusCtrl($scope, $route, roomService, clientService, socketIoService) {
        $scope.room = roomService.get({id:$route.current.params.id});
        $scope.clients = clientService.query({'room._id':$route.current.params.id, limit:1000});

        $scope.subscribedBeans = {};

        $scope.clients.$promise.then(function (clients) {

            clients.forEach(function (client) {
                if (client.bean) {
                    $scope.subscribedBeans[client.bean._id] = client.bean;
                }
            });

            Object.keys($scope.subscribedBeans).forEach(function (_id) {
                socketIoService.emit('join', 'bean ' + _id)
                    .on('reconnect', function () {
                        socketIoService.emit('join', 'bean ' + _id)
                    });
            });
        });

        socketIoService.on('temp data update', function (bean) {
            // console.log(bean.mac, bean.rssi, bean.temp + '°C', bean.humi + '%', bean.distance + 'cm');
            angular.extend($scope.subscribedBeans[bean._id], bean);
            $scope.$apply();
        });

        socketIoService.on('client status update', function (status) {

            var clientId = status.client;

            var client = $scope.clients.filter(function(client) {
                return client._id === clientId;
            })[0];

            if (!client) {
                return;
            }
            
            if (!client.status || client.status.name !== status.name) {
                // reload client detail for latest changes count
                clientService.get({id:client._id}, function (clientUpdated) {
                    client.status = clientUpdated.status;
                    client.lastChangedAt = clientUpdated.lastChangedAt;
                    client.changesToday = clientUpdated.changesToday;
                });
            }

            $scope.$apply();
        });

        $scope.$on('$destroy', function () {
            Object.keys($scope.subscribedBeans).forEach(function (_id) {
                socketIoService.emit('leave', 'bean ' + _id);
                socketIoService.off('temp data update');
                socketIoService.off('client status update');
                socketIoService.off('reconnect');
            });
        });
    }

})(); 



