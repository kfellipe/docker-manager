from django.shortcuts import render, redirect
import docker, json
from django.contrib import sessions
from .dockeractions import listar_containers_ativos, start_docker_container, stop_docker_container



def view_docker_containers(request):
    """
    View to list all active Docker containers.
    """
    if request.method == 'GET':
        status = request.session.pop('status', None)
        message = request.session.pop('message', None)
        return render(request, 'index.html', {'status': status, 'message': message})
    
    if request.method == 'POST':
        
        container_names = request.POST.getlist('container_names')
        action = request.POST.get('action')
        if action == "start":
            result = start_docker_container(container_names)
            home = redirect('view_docker_containers')
            request.session['status'] = result['status']
            request.session['message'] = result['message']
            return home
        
        if action == "stop":
            result = stop_docker_container(container_names)
            home = redirect('view_docker_containers')
            request.session['status'] = result['status']
            request.session['message'] = result['message']
            return home
        return redirect('view_docker_containers')