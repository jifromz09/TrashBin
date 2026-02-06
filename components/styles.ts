import {StyleSheet} from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  image: {
    width: '100%',
    height: 250,
    marginVertical: 16,
    borderRadius: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  labelText: {
    fontSize: 16,
  },
  confidence: {
    fontSize: 14,
    color: '#666',
  },
});

export default styles;
