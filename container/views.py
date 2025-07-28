from django.shortcuts import render, redirect
import docker, json
from django.contrib import sessions
from .dockeractions import listar_containers_ativos



def view_docker_containers(request):
    """
    View to list all active Docker containers.
    """
    if request.method == 'GET':
        status = request.session.pop('status', None)
        message = request.session.pop('message', None)
        return render(request, 'index.html', {'status': status, 'message': message})
    elif request.method == 'POST':
        # Se for POST, redireciona para GET para evitar erro
        return redirect('view_docker_containers')