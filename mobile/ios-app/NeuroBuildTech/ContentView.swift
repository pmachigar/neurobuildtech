// iOS App - ContentView.swift
// Main SwiftUI view for NeuroBuildTech iOS app

import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Inicio")
                }
                .tag(0)
            
            ServicesView()
                .tabItem {
                    Image(systemName: "list.bullet")
                    Text("Servicios")
                }
                .tag(1)
            
            ConsultingView()
                .tabItem {
                    Image(systemName: "message.fill")
                    Text("Consultoría")
                }
                .tag(2)
            
            AIToolsView()
                .tabItem {
                    Image(systemName: "brain.head.profile")
                    Text("IA")
                }
                .tag(3)
            
            IoTView()
                .tabItem {
                    Image(systemName: "wifi")
                    Text("IoT")
                }
                .tag(4)
        }
        .accentColor(.blue)
    }
}

struct HomeView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Hero Section
                    VStack(spacing: 10) {
                        Text("NeuroBuildTech")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        
                        Text("Innovación en IA, Automatización e IoT")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    
                    // Services Preview
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 15) {
                        ServiceCard(
                            title: "IA & ML",
                            icon: "brain.head.profile",
                            color: .purple
                        )
                        ServiceCard(
                            title: "Automatización",
                            icon: "gearshape.2.fill",
                            color: .orange
                        )
                        ServiceCard(
                            title: "IoT",
                            icon: "sensor.tag.radiowaves.forward.fill",
                            color: .green
                        )
                        ServiceCard(
                            title: "Domótica",
                            icon: "house.fill",
                            color: .blue
                        )
                    }
                    .padding(.horizontal)
                }
            }
            .navigationTitle("NeuroBuildTech")
        }
    }
}

struct ServiceCard: View {
    let title: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 30))
                .foregroundColor(color)
            
            Text(title)
                .font(.headline)
                .fontWeight(.semibold)
        }
        .frame(height: 100)
        .frame(maxWidth: .infinity)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// Placeholder views for other tabs
struct ServicesView: View {
    var body: some View {
        NavigationView {
            Text("Catálogo de Servicios")
                .navigationTitle("Servicios")
        }
    }
}

struct ConsultingView: View {
    var body: some View {
        NavigationView {
            Text("Portal de Consultoría")
                .navigationTitle("Consultoría")
        }
    }
}

struct AIToolsView: View {
    var body: some View {
        NavigationView {
            Text("Herramientas de IA")
                .navigationTitle("Herramientas IA")
        }
    }
}

struct IoTView: View {
    var body: some View {
        NavigationView {
            Text("Control IoT & Domótica")
                .navigationTitle("IoT & Domótica")
        }
    }
}

#Preview {
    ContentView()
}