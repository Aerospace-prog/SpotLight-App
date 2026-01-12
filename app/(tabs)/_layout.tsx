import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { COLORS } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
     screenOptions={{
        tabBarShowLabel : false,
        headerShown : false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor : COLORS.grey,
        tabBarStyle : {
          backgroundColor : "black",
          position : "absolute",
          borderTopWidth : 0,
          height : 40,
          elevation : 0,
          paddingBottom : 8
        }
     }}
    >
        <Tabs.Screen name="index" 
          options={{
            tabBarIcon : ({size , color})=> <Ionicons name = "home" size={size} color={color} />
          }}
        />
        <Tabs.Screen name="reels"
          options={{
            tabBarIcon : ({size , color}) => <Ionicons name = "play-circle" size = {size} color = {color}/>
          }}
         />
        <Tabs.Screen name="bookmarks"
          options={{
            tabBarIcon : ({size , color}) => <Ionicons name = "bookmark" size = {size} color = {color}/>
          }}
         />
         <Tabs.Screen name="create"
          options={{
            tabBarIcon : ({size , color})=> <Ionicons name = "add-circle" size = {size} color={COLORS.primary}/>
          }}
         />
        <Tabs.Screen name="notifications"
          options={{
            tabBarIcon : ({size , color})=> <Ionicons name = "heart" size = {size} color={color}/>
          }}
         />
        <Tabs.Screen name="profile" 
           options={{
            tabBarIcon : ({size , color})=> <Ionicons name = "person-circle" size = {size} color={color}/>
          }}
        />
    </Tabs>
  )
}